# Project: Hybrid 2D/3D Web Game Editor

Browser-based game editor and runtime for shipping multiple HTML5 games from one TypeScript monorepo.

* PixiJS for 2D, Three.js for 3D, React for editor UI, Node.js for project filesystem.
* pnpm workspaces + Vite. Games build independently and never depend on editor code.

The editor should resemble a lightweight Unity/Cocos-style workflow for HTML5. Prefer designs that stay understandable and extensible over the shortest implementation.

Priorities: clean architecture, editor/runtime separation, deterministic scene serialization, testability, multiple independently buildable games, designer-friendly workflows, and maintainability by humans and AI agents.

Human and operator docs: [`README.md`](./README.md). Developer how-tos and topic pages: [`docs/README.md`](./docs/README.md). This file is the architecture map (invariants, packages, which topic to open).

---

## How to use this documentation

Start at [`docs/README.md`](./docs/README.md) for “I want to…” links. Use this file for orientation and the invariant list below.

| Task | Read |
| --- | --- |
| Scene / domain model, components, serialization, prefabs | [`docs/scene-model.md`](./docs/scene-model.md) |
| Add a Script behaviour (Inspector + runtime) | [`docs/guides/add-a-script-component.md`](./docs/guides/add-a-script-component.md) |
| Asset database, import, browser, atlas, generated files | [`docs/assets.md`](./docs/assets.md) |
| Aseprite / LibreSprite compile pipeline | [`docs/aseprite.md`](./docs/aseprite.md) |
| Editor core, commands, undo, inspector, selection, layout | [`docs/editor.md`](./docs/editor.md) |
| Editor keyboard shortcuts | [`docs/hotkeys.md`](./docs/hotkeys.md) |
| Game runtime, independent builds, optional renderers | [`docs/runtime.md`](./docs/runtime.md) |
| Pixi / Three adapters and hybrid layers | [`docs/renderers.md`](./docs/renderers.md) |
| project-server, path confinement, uploads | [`docs/project-server.md`](./docs/project-server.md) |
| Collaboration, resource locking, Git | [`docs/collaboration.md`](./docs/collaboration.md) |
| Package boundaries, quality, errors, performance | [`docs/architecture.md`](./docs/architecture.md) |
| MVP phases and planned work | [`docs/roadmap.md`](./docs/roadmap.md) |

Cursor: `.cursor/rules/` (constraints) and `.cursor/skills/` (workflows). Use `architecture-change` for multi-package or schema/boundary work; `implement-editor-feature` for editor features.

---

## Critical invariants

Never violate these without an explicit architectural decision. If a request conflicts, stop and propose an alternative.

1. Runtime never depends on editor.
2. Scene/domain data never stores PixiJS or Three.js instances.
3. Persisted asset references use stable IDs, not filesystem paths.
4. Editor mutations use commands when they should be undoable.
5. Browser filesystem access goes through project-server, confined to the project root.
6. Each game’s build is independent from other games.
7. Optional renderers remain optional in game bundles.
8. Serialization is versioned.
9. Scene files stay Git-friendly (deterministic, no transient state).
10. React UI is not the source of truth for domain data.

```text
Editor → Scene model → Runtime → Pixi / Three
```

---

## High-level architecture

```text
  React editor UI
        │  commands, selection, layout
        ▼
  editor-core          project-server (filesystem, import, save)
        │                         │
        ▼                         ▼
     scene / assets / project  (serializable JSON)
        │
        ▼
     runtime
        ├── renderer-pixi
        └── renderer-three
```

Dependencies flow inward toward domain packages. Avoid cycles. A lower-level package must not import a higher-level application package.

Scene nodes use **component composition** (`Transform2D` + `Sprite` + `Button`), not deep node-type inheritance.

User mutations:

```text
UI → Command → Domain model → renderer synchronization
```

Do not mutate `PIXI.Sprite` / `THREE.Object3D` from React. Continuous gestures produce one command on completion.

---

## Workspace

pnpm workspaces (`apps/*`, `packages/*`, `games/*`). Internal packages use `workspace:*`.

```text
apps/editor              React + Vite editor (port 5173)
apps/project-server      Node filesystem / import / save API (port 8787)

packages/core            Event bus, domain errors
packages/shared          IDs, ports, shared primitives
packages/scene           Scene graph, components, Zod schema
packages/assets          Asset records, resolver, metadata
packages/project         project.json + game Vite helpers
packages/commands        Undoable command contract
packages/editor-core     Editor façade, commands, managers
packages/game-components defineComponent + shared behaviours
packages/runtime         Game loop, scene host (no editor deps)
packages/renderer-pixi   Pixi scene adapter
packages/renderer-three  Three scene adapter

games/<name>/            Independently buildable game + editable content
                         (assets/, project.json, .project/) — not a top-level projects/ tree
```

Current games include `editor-features-demo` (hybrid), `example-game-2` (Pixi), `muonline-game` (hybrid), and `solitaire` (Pixi). Collaboration locking is planned; there is no `packages/collaboration` yet — see [`docs/collaboration.md`](./docs/collaboration.md).

`project-server` defaults to `games/editor-features-demo`. Override with `PROJECT_ROOT`.

---

## Development conventions

* Strict TypeScript. No `any`; prefer `unknown` + Zod at JSON/HTTP boundaries. Discriminated unions for serialized variants. Details: `.cursor/rules/typescript.mdc`.
* Persist format versions on scene/project/asset JSON. Migrations for incompatible changes.
* Stable IDs via `createId(prefix)` in `@game-editor/shared` (`asset_`, `node_`, `comp_`, `scene_`).
* Editor UI is DOM/React. Pixi and Three are only for graphical viewports.
* Do not swallow errors. Surface meaningful messages for editor/filesystem/asset failures.
* Before adding a dependency: confirm it is needed, not duplicated, and acceptable in the runtime bundle if it is a game dependency.

Common commands: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`. Per-game: `pnpm --filter @games/<id> build`.

---

## Workflow (non-trivial changes)

1. Inspect existing code; reuse existing abstractions.
2. Identify affected packages and whether undo, persistence, renderers, or tests are involved.
3. Read only the docs in the table above that match those layers.
4. Implement the smallest coherent slice. Avoid unrelated changes.
5. Run relevant typecheck/tests/lint. A feature is not done because it merely looks correct.

Scaffolding: [`docs/guides/add-a-script-component.md`](./docs/guides/add-a-script-component.md); `.cursor/skills/create-game/` and `.cursor/skills/create-game-component/`.
