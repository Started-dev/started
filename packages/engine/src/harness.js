export function runHarness(kit, files) {
  return kit.harness.map((check) => {
    const content = files[check.path];
    let ok = false;
    let detail = "";
    if (check.kind === "exists") {
      ok = content !== undefined;
      detail = ok ? `${check.path} present` : `${check.path} missing`;
    } else if (content === undefined) {
      ok = false;
      detail = `${check.path} missing`;
    } else if (check.kind === "contains") {
      ok = Boolean(check.pattern && content.includes(check.pattern));
      detail = ok ? "matched" : `expected to contain ${JSON.stringify(check.pattern)}`;
    } else if (check.kind === "regex") {
      ok = Boolean(check.pattern && new RegExp(check.pattern).test(content));
      detail = ok ? "matched" : `regex failed ${check.pattern}`;
    } else {
      detail = `unknown check ${check.kind}`;
    }
    return { id: check.id, name: check.name, ok, detail };
  });
}
