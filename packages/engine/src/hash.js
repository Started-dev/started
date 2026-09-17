import { createHash, randomBytes } from "node:crypto";

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function uid(prefix) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}
