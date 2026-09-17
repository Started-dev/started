# Contributing

Kits land here only if they have a harness.

1. Add `kits/<id>/started.json`.
2. `tools.deny` must include `wallet.sign`.
3. `started init <id> /tmp/x && started run /tmp/x` must print `verified`.
4. No network, no broadcast, no git push in the graph.
