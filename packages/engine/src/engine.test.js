import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultInputs, executeStart, listKits, loadKit, runHarness } from "./index.js";

test("official catalog has three kits with harnesses", () => {
  const kits = listKits();
  assert.equal(kits.length, 3);
  assert.deepEqual(
    kits.map((k) => k.id).sort(),
    ["base-erc20", "local-agent-worker", "web-vite-app"],
  );
});

test("web-vite-app is red before run, green after", () => {
  const kit = loadKit("web-vite-app");
  const before = runHarness(kit, kit.initial);
  assert.equal(before.every((h) => h.ok), false);
  const { files, receipt } = executeStart({
    kit,
    files: kit.initial,
    inputs: defaultInputs(kit),
  });
  assert.equal(receipt.ok, true);
  assert.equal(runHarness(kit, files).every((h) => h.ok), true);
  assert.match(files["src/App.tsx"], /Harbor/);
});

test("local-agent-worker ships confirm()", () => {
  const kit = loadKit("local-agent-worker");
  const { files, receipt } = executeStart({
    kit,
    files: kit.initial,
    inputs: defaultInputs(kit),
  });
  assert.equal(receipt.ok, true);
  assert.match(files["src/worker.ts"], /function confirm/);
  assert.equal(kit.confirmRun, true);
});

test("base-erc20 interpolates symbol and never signs", () => {
  const kit = loadKit("base-erc20");
  assert.ok(kit.tools.deny.includes("wallet.sign"));
  const { files, receipt } = executeStart({
    kit,
    files: kit.initial,
    inputs: { token_name: "Harbor", symbol: "HRB", chain: "anvil" },
  });
  assert.equal(receipt.ok, true);
  assert.match(files["src/Token.sol"], /string public name = "Harbor"/);
  assert.match(files["src/Token.sol"], /string public symbol = "HRB"/);
});
