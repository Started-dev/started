export function interpolate(template, inputs) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => inputs[key] ?? "");
}

export function defaultInputs(kit) {
  const out = {};
  for (const input of kit.inputs ?? []) {
    out[input.id] = input.default ?? input.enum?.[0] ?? "";
  }
  return out;
}
