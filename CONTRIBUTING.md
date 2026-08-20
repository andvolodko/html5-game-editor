# Contributing

This is a pnpm TypeScript monorepo: browser editor, local project-server, and independently buildable games. Games must ship without editor code.

## Start here

| Need | Open |
| --- | --- |
| Run the editor / daily commands | [`README.md`](./README.md) |
| Invariants, packages, which topic to open | [`PROJECT.md`](./PROJECT.md) |
| Developer how-tos | [`docs/README.md`](./docs/README.md) |
| Shipped vs planned | [`docs/roadmap.md`](./docs/roadmap.md), [README — Suggested next work](./README.md#suggested-next-work) |

Cursor workflows live in `.cursor/skills/`. Persistent constraints live in `.cursor/rules/`.

## Setup

Need Node.js ≥ 20 and pnpm 10.33+ (`packageManager` in the root `package.json`).

```bash
pnpm install
pnpm dev
```

Editor: http://localhost:5173 — project-server: http://localhost:8787.

## Checks

Run the slice you touched. Before a PR, prefer:

```bash
pnpm check
```

That is `typecheck` + `lint` + `lint:deps` + `test`. `lint:deps` enforces package boundaries (runtime must not import editor packages).

## Working on a change

1. Reuse existing architecture. User-visible editor mutations go through commands (one completed gesture = one undo step).
2. React is a view. Do not store scene trees or Pixi/Three objects in React state, and do not persist `PIXI.*` / `THREE.*` in scene JSON.
3. Serialized data stays deterministic and Git-friendly. Asset references use stable `assetId`s.
4. After implementation, run tests and typecheck for affected packages.

Scaffolding: `.cursor/skills/create-game/`, `.cursor/skills/create-game-component/`, [`docs/guides/add-a-script-component.md`](./docs/guides/add-a-script-component.md).

## Pull requests

Keep the slice coherent and avoid unrelated files. Describe **why** the change exists. Do not skip hooks.
