# Developer docs

How the editor, scene format, runtime, and asset pipeline work **today**, and how to extend them.

Operator setup (`pnpm dev`, demo site, daily commands) lives in the root [`README.md`](../README.md). Architecture map and invariants: [`PROJECT.md`](../PROJECT.md).

---

## I want to…

| Goal | Start here |
| --- | --- |
| Run the editor or a game | [README — Getting started](../README.md#getting-started) |
| Understand packages and data flow | [`architecture.md`](./architecture.md), [`PROJECT.md`](../PROJECT.md) |
| Read or change scene JSON | [`scene-model.md`](./scene-model.md) |
| Add a Script behaviour (Inspector + runtime) | [Add a script component](./guides/add-a-script-component.md) |
| Understand undo, selection, Inspector, panels | [`editor.md`](./editor.md) |
| Boot a standalone game | [`runtime.md`](./runtime.md) |
| Add or change a Pixi / Three node type | [`renderers.md`](./renderers.md), [`scene-model.md`](./scene-model.md) |
| Import assets, IDs, `.generated/` | [`assets.md`](./assets.md) |
| Aseprite / LibreSprite compile | [`aseprite.md`](./aseprite.md) |
| project-server HTTP / path confinement | [`project-server.md`](./project-server.md) |
| Keyboard shortcuts | [`hotkeys.md`](./hotkeys.md) |
| What is shipped vs planned | [`roadmap.md`](./roadmap.md) |

---

## Topic docs

| Doc | What it covers | Status |
| --- | --- | --- |
| [`architecture.md`](./architecture.md) | Package boundaries, quality, errors, performance | Shipped conventions |
| [`scene-model.md`](./scene-model.md) | Scene graph, components, Zod, prefabs | Shipped (`version: 1`) |
| [`editor.md`](./editor.md) | `Editor` façade, commands, selection, Inspector | Shipped |
| [`runtime.md`](./runtime.md) | `GameRuntime`, independent game builds | Shipped |
| [`renderers.md`](./renderers.md) | Pixi / Three adapters, hybrid layers, node types | Shipped (see per-type table) |
| [`assets.md`](./assets.md) | Catalogue, import, atlas, generated files | Partial (Aseprite in; loose-PNG atlas not) |
| [`aseprite.md`](./aseprite.md) | Compile pipeline, CLI, serialization | Shipped |
| [`project-server.md`](./project-server.md) | Filesystem API used by the browser editor | Shipped |
| [`hotkeys.md`](./hotkeys.md) | Editor shortcuts | Shipped |
| [`collaboration.md`](./collaboration.md) | Resource locks, Git as source of truth | **Not implemented** (design only) |
| [`roadmap.md`](./roadmap.md) | Phases and remaining work | Living list |

Guides are written as developer how-tos. A few topic pages still mix “what exists” with design constraints; prefer the rewritten pages and guides when both exist.

---

## Guides

| Guide | Use it for |
| --- | --- |
| [Add a script component](./guides/add-a-script-component.md) | `defineComponent` + behaviour class, catalog, Inspector, runtime install |

Scaffolding an entire game: copy an existing `games/*` package (see [README — Working with games](../README.md#working-with-games)) or follow `.cursor/skills/create-game/`. Other Cursor workflows (`add-node-type`, `add-asset-type`, `add-editor-command`, `add-editor-panel`, `implement-runtime-feature`, `modify-scene-schema`, …) live under `.cursor/skills/` — see `PROJECT.md`.

---

## Code map (short)

```text
apps/editor              React shell — reads Editor, dispatches commands
apps/project-server      Filesystem / import / save (browser never talks to disk)

packages/editor-core     Editor façade, commands, managers
packages/scene           Scene JSON types, Zod, prefabs, node ops
packages/assets          Asset records and resolvers
packages/runtime         Game loop + Script host (no editor deps)
packages/game-components defineComponent + shared behaviours
packages/renderer-pixi   Pixi adapter
packages/renderer-three  Three adapter

games/<name>/            Independently buildable game + editable content
```
