import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { main } from "./cli.js";

test("init + run + verify web-vite-app", async () => {
  const dir = mkdtempSync(join(tmpdir(), "started-"));
  try {
    await main(["init", "web-vite-app", dir]);
    const before = readFileSync(join(dir, "src/App.tsx"), "utf8");
    assert.match(before, /TODO/);
    await main(["run", dir]);
    const after = readFileSync(join(dir, "src/App.tsx"), "utf8");
    assert.match(after, /<h1>/);
    const receipt = JSON.parse(readFileSync(join(dir, ".started/receipt.json"), "utf8"));
    assert.equal(receipt.ok, true);
    await main(["verify", join(dir, ".started/receipt.json")]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
