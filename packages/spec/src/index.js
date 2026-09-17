export const SPEC_VERSION = "0.1.0";
export const DENY_DEFAULT = ["net.unrestricted", "wallet.sign"];

export function kitFingerprint(kit) {
  return `${kit.id}@${kit.version}`;
}

export function assertKit(kit) {
  const errors = [];
  if (!kit || typeof kit !== "object") errors.push("kit must be an object");
  if (!kit?.id) errors.push("id required");
  if (!kit?.version) errors.push("version required");
  if (!Array.isArray(kit?.harness) || kit.harness.length === 0) errors.push("harness required");
  if (!Array.isArray(kit?.graph)) errors.push("graph required");
  if (!kit?.tools?.allow || !kit?.tools?.deny) errors.push("tools.allow and tools.deny required");
  if (kit?.tools?.deny && !kit.tools.deny.includes("wallet.sign")) {
    errors.push("tools.deny must include wallet.sign");
  }
  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.errors = errors;
    throw err;
  }
  return kit;
}

export function assertReceipt(receipt) {
  const errors = [];
  if (!receipt?.id) errors.push("id required");
  if (!receipt?.kit) errors.push("kit required");
  if (!receipt?.kitSha) errors.push("kitSha required");
  if (!Array.isArray(receipt?.harness)) errors.push("harness required");
  if (typeof receipt?.ok !== "boolean") errors.push("ok required");
  if (errors.length) throw new Error(errors.join("; "));
  return receipt;
}
