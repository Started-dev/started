# Started

Local-first runtime for verified agent kits.

A **Start** is not a prompt. It is a versioned kit (`started.json`) with inputs, a closed tool policy, a graph, and a harness. The engine writes files, scores the harness, and signs a **receipt**. If the harness is red, the Start is not done.

Cloud inference is optional. Local is the default.

```
started list
started init web-vite-app ./harbor
started run ./harbor
started verify ./harbor/.started/receipt.json
```

## Repos

| Repo | Role |
| --- | --- |
| [`started`](https://github.com/Started-dev/started) | Spec, engine, CLI, official kits |
| [`runner`](https://github.com/Started-dev/runner) | Isolated execution. Same receipt schema. |
| [`started-ai`](https://github.com/Started-dev/started-ai) | Optional model adapter (Ollama first, BYO keys) |

Studio is a viewer. The engine works without it.

## Contract

A kit without a harness is not a Start.

Receipts are the unit of truth: kit hash, steps, harness, artifacts.

## Packages

- `@started/spec` — kit + receipt schema
- `@started/engine` — interpolate, graph, harness, receipt
- `@started/cli` — `started` binary

Official kits live in [`kits/`](./kits).

## Policy

- Network off during harness
- `wallet.sign` denied
- Side effects require `confirm()` (`STARTED_CONFIRM=1` or Studio approval)
- No deploy, no git push from a kit graph

## License

Apache-2.0
