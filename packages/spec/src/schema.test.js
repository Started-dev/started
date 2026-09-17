import assert from "node:assert/strict";
import { test } from "node:test";
import { assertKit, assertReceipt, kitFingerprint } from "./index.js";

const kit = {
  id: "demo",
  version: "0.0.1",
  tools: { allow: ["fs"], deny: ["wallet.sign"] },
  harness: [{ id: "a", name: "exists", kind: "exists", path: "README.md" }],
  graph: [],
};

test("assertKit accepts a closed kit", () => {
  assert.equal(assertKit(kit).id, "demo");
  assert.equal(kitFingerprint(kit), "demo@0.0.1");
});

test("assertKit rejects a kit without a harness", () => {
  assert.throws(() => assertKit({ ...kit, harness: [] }), /harness/);
});

test("assertKit rejects unsigned spend", () => {
  assert.throws(
    () => assertKit({ ...kit, tools: { allow: ["fs"], deny: [] } }),
    /wallet.sign/,
  );
});

test("assertReceipt requires kitSha", () => {
  assert.throws(() => assertReceipt({ id: "r", kit: "demo@0.0.1", ok: true, harness: [] }), /kitSha/);
});
