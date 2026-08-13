# HTML5 Game Editor

A browser-based hybrid **2D / 3D** game editor and runtime for shipping multiple HTML5 games from one TypeScript monorepo.

PixiJS handles 2D. Three.js handles 3D. React is the editor shell. Games build independently and never depend on editor code.

![HTML5 Game Editor — PixiJS and Three.js scene viewport](docs/screenshots/html5-game-editor-pixijs-threejs-monorepo.png)

**[Live demo](https://andvolodko.github.io/html5-game-editor/)** — static GitHub Pages build of the editor (all `games/*` projects, no project-server). Scene edits stay in this browser (`localStorage`). Asset import needs a local `pnpm dev`.

Playable standalone builds of every game are on the same site: **[demo games](https://andvolodko.github.io/html5-game-editor/games/)** ([Example Game](https://andvolodko.github.io/html5-game-editor/games/example-game/), [Example Game 2](https://andvolodko.github.io/html5-game-editor/games/example-game-2/), [MU Online](https://andvolodko.github.io/html5-game-editor/games/muonline-game/)).

> Status: active development. The foundation through hybrid rendering, assets, undo/redo, and playable example games is in place. Collaboration, prefabs, and advanced tooling are still ahead.

---

## Contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Static demo (GitHub Pages)](#static-demo-github-pages)
- [Daily commands](#daily-commands)
- [Using the editor](#using-the-editor)
- [Working with games](#working-with-games)
- [Script components](#script-components)
- [Suggested next work](#suggested-next-work)
- [Documentation](#documentation)
- [Author](#author)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Why this exists

The goal is a lightweight Unity / Cocos-style workflow aimed specifically at HTML5:

- Design scenes in the browser.
- Persist them as Git-friendly JSON (stable IDs, versioned schemas).
- Play and ship games without bundling the editor.
- Mix 2D UI and 3D worlds in the same scene when needed.
- Keep Pixi and Three as adapters — never as the source of truth.

---

## Features

| Area | What you get today |
| --- | --- |
| **Editor** | Dockable panels (Hierarchy, Scene, Inspector, Assets, Preview, Console, Project Settings), persisted layout, undo/redo, unsaved-changes guard |
| **2D (PixiJS 8)** | Container, Sprite, NineSlice, TilingSprite, Graphics, Text, HTMLText, BitmapText, meshes, AnimatedSprite, Spine |
| **3D (Three.js)** | Model3D (glTF / GLB), PerspectiveCamera, DirectionalLight, AmbientLight, Transform3D |
| **Hybrid scenes** | Stacked Pixi / Three layers so UI, world, and background can share one scene |
| **Assets** | Import textures, audio, Spine bundles, glTF/GLB; scenes reference stable `assetId`s, not filesystem paths |
| **Runtime** | `GameRuntime` + script components, scene flow, asset preload, HTML audio, independent Vite builds per game |
| **Project server** | Local Node HTTP API for save/load, import, folders, and project switching — browser never gets raw filesystem access |

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript 5.9, strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`, `games/*`) |
| Editor UI | React 19, Vite 7, [dockview](https://github.com/mathuo/dockview) |
| 2D renderer | PixiJS 8, Spine via `@esotericsoftware/spine-pixi-v8` |
| 3D renderer | Three.js 0.185 |
| Domain / validation | Zod schemas for scene, assets, and project JSON |
| Runtime | `@game-editor/runtime` — no React, no editor packages |
| Local backend | Node.js 20+ HTTP server (`tsx` in development) |
| Tests / quality | Vitest, ESLint (typescript-eslint), `pnpm typecheck` |

---

## Architecture

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

**Dependency rule:** arrows flow toward domain packages. Runtime must never import editor code. Serialized scenes must never contain `PIXI.*` or `THREE.*` objects.

```text
Editor  →  Scene model  →  Runtime  →  Pixi / Three
```

Games that only need 2D should depend on `renderer-pixi` and omit Three from the production bundle.

---

## Repository layout

```text
html5-game-editor/
├── apps/
│   ├── editor/            # Browser editor (React + Vite, port 5173)
│   └── project-server/    # Local project API (port 8787)
├── packages/
│   ├── core/              # Event bus, domain errors
│   ├── shared/            # IDs, ports, shared primitives
│   ├── scene/             # Scene graph, components, Zod schema
│   ├── assets/            # Asset records, resolver, metadata
│   ├── project/           # project.json + game Vite helpers
│   ├── commands/          # Undoable command contract
│   ├── editor-core/       # Editor façade, commands, managers
│   ├── game-components/   # defineComponent + shared behaviours
│   ├── runtime/           # Game loop, scene host, asset collection
│   ├── renderer-pixi/     # Pixi scene adapter
│   └── renderer-three/    # Three scene adapter
├── games/
│   ├── example-game/      # Hybrid Pixi + Three demo (port 5174)
│   ├── example-game-2/    # Pixi-only demo (port 5175)
│   └── muonline-game/     # Three.js game (port 5176)
├── docs/screenshots/      # README captures
├── PROJECT.md             # Architecture spec and invariants
└── pnpm-workspace.yaml
```

Editable game content lives **next to the buildable package** under `games/<name>/` (`assets/`, `project.json`, `.project/`) — not in a separate projects tree.

---

## Getting started

**Requirements**

- Node.js **≥ 20**
- [pnpm](https://pnpm.io/) **10.33+** (see `packageManager` in the root `package.json`)

```bash
pnpm install
pnpm dev
```

That starts both the editor and the project server in parallel.

| Service | URL |
| --- | --- |
| Editor | http://localhost:5173 |
| Project server | http://localhost:8787 |
| Vite `/api` proxy | Editor → project server (path prefix stripped) |

The server opens `games/example-game` by default. Override with:

```bash
# Windows (PowerShell)
$env:PROJECT_ROOT = "C:\path\to\games\example-game-2"
$env:GAMES_ROOT   = "C:\path\to\games"
pnpm --filter @game-editor/project-server dev

# macOS / Linux
PROJECT_ROOT=./games/example-game-2 GAMES_ROOT=./games pnpm --filter @game-editor/project-server dev
```

You can also switch games from **File → Open Project** in the editor toolbar.

---

## Static demo (GitHub Pages)

The hosted site is a **static Vite build**. It does not run `project-server`. The editor bundles every package under `games/` (scenes, `project.json`, asset catalogue) and serves files from `/demo/<project-id>/assets`. Switch games with **File → Open Project**.

Each `games/<id>` package is also built as a standalone player and copied to `/games/<id>/`. New games are picked up automatically — no workflow edit.

| Works in the demo | Needs local `pnpm dev` |
| --- | --- |
| Hierarchy, viewport, gizmos, inspector | Asset import / folder create |
| Undo/redo, save scene (this browser) | Real filesystem persistence |
| Asset browser, Preview, script components | |
| Open any bundled `games/*` project | |
| Play `/games/<id>/` without the editor | |

```bash
pnpm dev:demo          # editor only, no project-server
pnpm build:demo        # editor snapshot in apps/editor/dist
pnpm build:pages       # editor + every games/* player (GitHub Pages artifact)
```

Push to `master` deploys via GitHub Actions. In the repo: **Settings → Pages → Source: GitHub Actions**.

---

## Daily commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Editor + project server |
| `pnpm dev:demo` | Editor only (static snapshot of every `games/*` project) |
| `pnpm build:demo` | Static editor snapshot (`apps/editor/dist`) |
| `pnpm build:pages` | Editor + standalone `games/*` builds for GitHub Pages |
| `pnpm test` | Vitest across workspaces |
| `pnpm typecheck` | `tsc --noEmit` across workspaces |
| `pnpm lint` | ESLint (`--max-warnings=0` in packages that define it) |
| `pnpm build` | Build packages, then apps and games |

Per-package / per-game:

```bash
pnpm --filter @game-editor/editor dev
pnpm --filter @game-editor/project-server dev

pnpm --filter @games/example-game dev
pnpm --filter @games/example-game build
pnpm --filter @games/example-game-2 dev
pnpm --filter @games/muonline-game dev
```

Game Vite configs import TypeScript from `@game-editor/project/vite`, so game scripts use `--configLoader runner`.

---

## Using the editor

Default docking layout:

```text
┌─────────────────────────────────────────────────────┐
│ Toolbar  (File / Edit / Node, undo, save, project)  │
├────────────┬──────────────────────────┬─────────────┤
│ Hierarchy  │ Scene viewport           │ Inspector   │
│            │ (Pixi + Three, gizmos)   │             │
├────────────┼──────────────────────────┤             │
│ Assets     │ Preview / Console        │             │
└────────────┴──────────────────────────┴─────────────┘
```

Typical loop:

1. Open a game project.
2. Create or select nodes in Hierarchy / Scene.
3. Assign textures, Spine, audio, or glTF from the Asset Browser (import via drag-and-drop).
4. Tune transforms and visual fields in the Inspector; add Script components from **Add Component**.
5. Save the scene (dirty state is tracked against the last saved snapshot).
6. Use **Preview** to run the game runtime inside the editor, or `pnpm --filter @games/<name> dev` for a standalone window.

Meaningful edits go through commands so undo/redo stays consistent. Drag gestures commit **one** command on pointer-up, not one per mouse move.

---

## Working with games

Each game is a workspace package:

```text
games/example-game/
├── project.json           # display name, resolution, start scene, renderers
├── .project/assets.json   # asset database (stable IDs)
├── assets/scenes/         # versioned scene JSON
├── src/main.ts            # boot GameRuntime, register components
├── src/components/        # game-specific Script behaviours
├── package.json
└── vite.config.ts
```

`project.json` example:

```json
{
  "name": "example-game",
  "version": 1,
  "displayName": "Example Game",
  "renderers": ["pixi", "three"],
  "startScene": "loading",
  "resolution": { "width": 1280, "height": 720 },
  "background": "#1c2a4a"
}
```

To add a new game, follow `.cursor/skills/create-game/SKILL.md` (or copy `games/example-game-2` for Pixi-only, `games/muonline-game` for Three-only, `games/example-game` for hybrid). Give it a unique Vite port, and register components from `src/components`. Keep Three out of `dependencies` if the game never uses 3D. Keep Pixi out if the game is Three-only.

---

## Script components

Gameplay is composition, not deep node inheritance:

```text
Node
├── Transform2D
├── Sprite
└── Script (e.g. shared.ChangeScene)
```

Define behaviours with `defineComponent` and an OOP class that implements `ScriptInstance`:

| Kind | Location | ID prefix |
| --- | --- | --- |
| Game-specific | `games/<name>/src/components/` | `<game>.PascalName` |
| Shared | `packages/game-components/src/shared/` | `shared.PascalName` |

Built-in shared components today: **Change Scene**, **Load All Scene Assets**, **Performance Meter**, **Audio Click**.

Shared components must stay runtime-safe: no React, Pixi, Three, or `editor-core`.

---

## Suggested next work

The architecture spec in [`PROJECT.md`](./PROJECT.md) is larger than the current product. Highest-leverage additions:

### Editor & content pipeline

- **Prefabs** — reusable node subgraphs with instance overrides
- **Spritesheet / atlas generation** — pack imported textures; wire BitmapText to a real font importer
- **Timeline & animation** — clip editing for Spine, AnimatedSprite, and glTF animations
- **Particles, masks, filters** — Pixi ParticleContainer is deferred; masks/filters are still design-only
- **Richer 3D** — HDR environments, shadows, materials, post-processing (extension points exist; implementations do not)

### Runtime & games

- **Physics** — optional 2D/3D adapter that stays out of serialized scene data
- **Input map** — named actions instead of ad-hoc pointer handlers in each behaviour
- **Audio mixer** — buses, volume, and spatial playback beyond one-shot HTML audio
- **Tilemaps / layout** — UI layout component and 2D tilemap support
- **Optional renderer hygiene** — ensure Pixi-only games never statically import Three

### Collaboration & operations

- **Multi-user locking** — resource locks + heartbeat so two editors cannot clobber the same scene
- **Project-server auth** — CORS is `*` for local dev only; do not widen trust without an explicit product decision
- **CI** — GitHub Actions (or equivalent) for `typecheck`, `test`, `lint`, and game builds
- **Root scripts** — `dev:editor`, `build:games`, and a documented `create-game` scaffold
- **Contributing guide** — a short CONTRIBUTING.md pointing at `PROJECT.md` invariants

### Quality

- **Schema migrations** — versioned scene/project JSON already exists; add an explicit migration runner and fixtures
- **Play-mode isolation** — clearer edit vs play state so preview cannot leak into the document
- **Structured logging** — feed editor/runtime logs into the Console panel instead of ad-hoc `console` calls

When adding a feature, keep the mutation path:

```text
UI  →  Command  →  Domain model  →  Renderer sync
```

Do not mutate `PIXI.Sprite` or `THREE.Object3D` from React.

---

## Documentation

| Doc | Use it for |
| --- | --- |
| [`PROJECT.md`](./PROJECT.md) | Vision, package boundaries, serialization, MVP phases, definition of done |
| `.cursor/rules/` | Package-specific invariants (editor UI, commands, server security, TypeScript) |
| `.cursor/skills/create-game/` | How to scaffold a new `games/<name>` package |
| `.cursor/skills/create-game-component/` | How to add a Script component |
| `.cursor/skills/implement-editor-feature/` | How to land an editor feature without breaking undo, persistence, or tests |

---

## Author

Created and written by **[Andrii Volodko](https://github.com/andvolodko)**.

---

## Acknowledgments

This project was developed with [Cursor](https://cursor.com) using the **High Fast** preset.

---

## License

Released under the [MIT License](./LICENSE). Copyright © 2026 Andrii Volodko.
