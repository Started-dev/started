import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defaultInputs, executeStart, listKits, loadKit } from "@started/engine";
import { assertReceipt } from "@started/spec";

export async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "-h") return help();
  if (cmd === "list") return list();
  if (cmd === "init") return init(rest[0], rest[1]);
  if (cmd === "run") return run(rest[0]);
  if (cmd === "verify") return verify(rest[0]);
  throw new Error(`unknown command: ${cmd}`);
}

function help() {
  console.log(`started — local runtime for verified agent kits

  started list
  started init <kit> [dir]
  started run [dir]
  started verify <receipt.json>
`);
}

function list() {
  for (const kit of listKits()) {
    console.log(`${kit.id.padEnd(22)} v${kit.version}  ${kit.tagline}`);
  }
}

function init(kitId, dir) {
  if (!kitId) throw new Error("usage: started init <kit> [dir]");
  const kit = loadKit(kitId);
  const root = resolve(dir ?? kitId);
  mkdirSync(root, { recursive: true });
  for (const [path, content] of Object.entries(kit.initial)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  mkdirSync(join(root, ".started"), { recursive: true });
  writeFileSync(
    join(root, ".started/workspace.json"),
    JSON.stringify(
      {
        kitId: kit.id,
        kitVersion: kit.version,
        createdAt: new Date().toISOString(),
        inputs: defaultInputs(kit),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`initialized ${kit.id}@${kit.version} in ${root}`);
}

function run(dir) {
  const root = resolve(dir ?? ".");
  const wsPath = join(root, ".started/workspace.json");
  if (!existsSync(wsPath)) throw new Error("not a Start workspace — run started init first");
  const ws = JSON.parse(readFileSync(wsPath, "utf8"));
  const kit = loadKit(ws.kitId);
  const files = { ...kit.initial };
  for (const path of Object.keys(kit.initial)) {
    const full = join(root, path);
    if (existsSync(full)) files[path] = readFileSync(full, "utf8");
  }
  const result = executeStart({
    kit,
    files,
    inputs: { ...defaultInputs(kit), ...ws.inputs },
    workspaceId: ws.id,
  });
  for (const [path, content] of Object.entries(result.files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  writeFileSync(join(root, ".started/receipt.json"), JSON.stringify(result.receipt, null, 2) + "\n");
  const status = result.receipt.ok ? "verified" : "failed";
  console.log(`${status}  ${result.receipt.kit}  ${result.receipt.id}`);
  for (const h of result.receipt.harness) {
    console.log(`  ${h.ok ? "pass" : "fail"}  ${h.name}`);
  }
  if (!result.receipt.ok) process.exitCode = 1;
}

function verify(file) {
  if (!file) throw new Error("usage: started verify <receipt.json>");
  const receipt = JSON.parse(readFileSync(resolve(file), "utf8"));
  assertReceipt(receipt);
  if (!receipt.ok) {
    console.log(`failed  ${receipt.kit}  ${receipt.id}`);
    process.exitCode = 1;
    return;
  }
  console.log(`verified  ${receipt.kit}  sha ${receipt.kitSha}`);
}
