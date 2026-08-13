---
name: create-game
description: >-
  Scaffold a new independently buildable game under games/<name> (package.json,
  project.json, Vite, scenes, runtime boot). Use when adding a new game, game
  package, games/* project, Pixi-only / Three-only / hybrid game, or copying
  example-game / example-game-2 / muonline-game.
---

# Create Game

Scaffold a new workspace package under `games/<id>/`. Do **not** invent a parallel `projects/` tree. Do **not** copy `node_modules`, `dist`, or demo binary assets.

After the package exists, add Script components with `.cursor/skills/create-game-component/SKILL.md`.

## 1. Name and renderer

Ask if missing. Then lock:

| Field | Rule |
| --- | --- |
| Folder / `project.json` `name` | Same id: `games/<id>/`. Must match `PROJECT_ID_PATTERN`: `^[A-Za-z0-9._-]+$` |
| npm name | `@games/<id>` |
| Display name | Human title in `project.json` `displayName` |
| Vite port | Unique. Grep `games/*/vite.config.ts` (`port:`). Editor is 5173; project-server is 8787 |

Pick **one** renderer profile:

| Profile | Copy structure from | `project.json` `renderers` | Scene `renderer` | Dependencies |
| --- | --- | --- | --- | --- |
| Pixi-only | `games/example-game-2` | `["pixi"]` | omit or `"pixi"` | `renderer-pixi` — **no** `renderer-three` |
| Three-only | `games/muonline-game` | `["three"]` | `"three"` | `renderer-three` — **no** `renderer-pixi` |
| Hybrid | `games/example-game` (`src/mount-renderers.ts`) | `["pixi", "three"]` | `"hybrid"` when both 2D and 3D nodes exist | both renderers |

Games that never use 3D must not depend on Three. Games that never use 2D must not depend on Pixi.

## 2. Files to create

```text
games/<id>/
├── package.json
├── project.json
├── tsconfig.json          # same as other games (extends ../../tsconfig.base.json)
├── vite.config.ts         # defineGameViteConfig({ port })
├── index.html             # stub that loads /src/main.ts
├── .project/assets.json   # { "version": 1, "assets": [] }
├── assets/scenes/main.json
└── src/
    ├── main.ts
    ├── mount-renderers.ts # Three-only and hybrid; Pixi-only may inline Pixi in main.ts
    ├── events/bus-events.ts
    └── components/index.ts
```

`pnpm-workspace.yaml` already includes `games/*`. Do not add a second workspace glob.

`package.json` must include:

- `"type": "module"`, `exports` for `"."` → `./src/main.ts` and `"./components"` → `./src/components/index.ts`
- scripts: `dev` / `build` / `preview` with `vite --configLoader runner`; `typecheck`; `lint` (`eslint src --max-warnings=0`)
- workspace deps: `@game-editor/game-components`, `@game-editor/project`, `@game-editor/runtime`, `@game-editor/scene`, plus the renderer package(s) from the table
- devDeps: `typescript`, `vite` (match versions from an existing game)

`project.json`:

```json
{
  "name": "<id>",
  "version": 1,
  "displayName": "<Title>",
  "renderers": ["three"],
  "startScene": "main",
  "resolution": { "width": 1280, "height": 720 },
  "background": "#0c1018"
}
```

`startScene` is the scene **file id** (basename of `assets/scenes/<id>.json`), not an asset id. That file must exist or the editor demo snapshot skip/fail logic will drop the project.

## 3. Scene JSON

Use stable ids with prefixes (`scene_`, `node_`, `comp_`) plus `crypto.randomUUID()`. Never persist `PIXI.*` / `THREE.*` objects or filesystem texture paths — assets go in `.project/assets.json` with `assetId` references.

**Pixi-only starter:** one `Transform2D` node is enough (optional Text). See `games/example-game-2/assets/scenes/main.json`.

**Three-only starter:** `renderer: "three"` plus PerspectiveCamera, AmbientLight, DirectionalLight (each with `Transform3D`). Do not add `Model3D` until a glTF asset exists. See `games/muonline-game/assets/scenes/main.json`.

Do **not** copy example-game Spine/glTF/audio trees unless the user asked for that demo content.

## 4. Boot and catalog

Copy `main.ts` / `mount-renderers.ts` from the matching template, then rename functions (`mountExampleGameRenderers` → `mount<Game>Renderers`). Keep:

- `import.meta.glob("../assets/scenes/*.json")` + `resolveGameProject({ …, baseUrl: import.meta.env.BASE_URL })` so GitHub Pages can host the game under `/games/<id>/`
- `registerGameComponents` + `installSceneFlowRuntime`
- `GameRuntime` with `changeScene` remounting renderers
- Three: `ThreeGltfCache` + preload via `resolver.resolveGltfUrls`
- Pixi: `preloadPixiSceneAsset` when the game depends on Pixi

`src/components/index.ts` must export:

- `registerGameComponents` — always `registerSharedComponents(registry)` first
- `getComponentCatalog()` — `buildComponentCatalog(registerGameComponents, listBusEvents())`
- `listBusEvents()` from `src/events/bus-events.ts` (empty catalog is fine)
- `installGameRuntime` **only** once game-specific `create` factories exist (editor glob: `games/*/src/components/index.ts`)

Do not add placeholder Script components (bounce, loading buttons, etc.) unless the user asked for a playable demo.

## 5. Discovery (do not hardcode)

These already glob every `games/<id>/`. **Do not** add the new id to editor/runtime maps:

- Editor demo: `apps/editor/src/demo/load-demo-snapshot.ts`
- Preview runtime: `apps/editor/src/components/install-active-game-runtime.ts`
- project-server: `GAMES_ROOT` (default `games/`), `GET /projects`
- GitHub Pages: `scripts/assemble-github-pages.mjs` (`pnpm build:pages`) copies every `games/<id>` with `project.json` to `/games/<id>/`

Do **not** change the default `PROJECT_ROOT` (`games/example-game`) unless the user asks.

Update `README.md` layout + port list + “add a new game” sentence so the new package is documented.

## 6. Validate

```bash
pnpm install
pnpm --filter @games/<id> typecheck
pnpm --filter @games/<id> lint
```

Standalone: `pnpm --filter @games/<id> dev`  
Editor: File → Open Project (restart `pnpm dev` if the server was already running).

## Checklist

- [ ] Folder id = `project.json` `name` = `@games/<id>` suffix
- [ ] Unique Vite port
- [ ] Renderer deps match `renderers` (no unused Pixi/Three)
- [ ] `assets/scenes/<startScene>.json` exists and parses
- [ ] Empty `.project/assets.json` unless real assets were added
- [ ] `getComponentCatalog` exported
- [ ] No editor-package imports from the game
- [ ] README mentions the game (layout, port, and Pages `/games/<id>/` link)
- [ ] `typecheck` / `lint` pass
- [ ] No copied `dist` / `node_modules` / unrelated demo binaries
