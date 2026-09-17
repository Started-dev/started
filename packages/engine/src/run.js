import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertKit, kitFingerprint } from "@started/spec";
import { sha256, uid } from "./hash.js";
import { interpolate } from "./interpolate.js";
import { runHarness } from "./harness.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const KITS_DIR = join(ROOT, "kits");

export function listKits() {
  return readdirSync(KITS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => loadKit(d.name));
}

export function loadKit(id) {
  const path = join(KITS_DIR, id, "started.json");
  const kit = JSON.parse(readFileSync(path, "utf8"));
  return assertKit(kit);
}

export function applyGraph(kit, files, inputs) {
  const next = { ...files };
  const steps = [];
  for (const step of kit.graph) {
    if (step.op !== "write") {
      steps.push({ tool: step.op, path: step.path, ok: false, detail: "unknown op" });
      continue;
    }
    next[step.path] = interpolate(step.content, inputs);
    steps.push({ tool: "fs.write", path: step.path, ok: true, detail: `${step.path} written` });
  }
  return { files: next, steps };
}

export function executeStart({ kit, files, inputs, workspaceId, model }) {
  assertKit(kit);
  const startedAt = new Date().toISOString();
  const applied = applyGraph(kit, files, inputs);
  const harness = runHarness(kit, applied.files);
  const allOk = harness.every((h) => h.ok);
  const cmd = harnessCommand(kit);
  const steps = [
    ...applied.steps,
    { tool: "shell", cmd, ok: allOk, detail: allOk ? "exit 0" : "harness failed" },
  ];
  const kitSha = sha256(JSON.stringify({ id: kit.id, version: kit.version, graph: kit.graph })).slice(0, 16);
  return {
    files: applied.files,
    receipt: {
      id: uid("rcpt"),
      workspaceId: workspaceId ?? uid("ws"),
      kit: kitFingerprint(kit),
      kitVersion: kit.version,
      kitSha,
      startedAt,
      finishedAt: new Date().toISOString(),
      ok: allOk,
      model: model ?? { endpoint: "local-graph", name: "started-engine" },
      steps,
      harness,
      artifacts: kit.graph.map((g) => g.path),
    },
  };
}

function harnessCommand(kit) {
  if (kit.category === "onchain") return "forge test";
  if (kit.category === "agent") return "npx tsc --noEmit && node --check src/worker.ts";
  return "npx vitest run";
}
