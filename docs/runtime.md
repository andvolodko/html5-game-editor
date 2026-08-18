# Runtime

Game runtime, independent game builds, and optional renderer dependencies.

Orientation: [`PROJECT.md`](../PROJECT.md). Renderers: [`renderers.md`](./renderers.md). Scaffolding a game: `.cursor/skills/create-game/SKILL.md`.

---

## Runtime packages

Games use runtime packages without editor dependencies.

```text
games/<name>/
├── src/
├── assets/
│   └── scenes/
├── project.json
├── package.json
└── vite.config.ts
```

Each game is independently buildable. Example dependency: `"@game-editor/runtime": "workspace:*"`.

Optional tab icons live under `public/` (`favicon.svg`, `favicon.png`, `favicon.ico`, `apple-touch-icon.png`). The shared game HTML shell links whichever of those files exist.

Do not import editor packages (`editor-core`, `apps/editor`) from runtime or game code. Shared script components must stay runtime-safe: no React, Pixi, Three, or `editor-core`.

---

## Game builds

Each game owns its own Vite build:

```bash
pnpm --filter @games/editor-features-demo build
```

Output: `games/editor-features-demo/dist/`.

Building one game must not bundle another game. The monorepo does **not** produce one global game bundle.

Root-level scripts that exist today include `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`. Additional convenience scripts (`dev:editor`, `build:games`) are planned; see [`roadmap.md`](./roadmap.md). Every workspace package should expose only meaningful scripts.

---

## Optional renderer dependencies

Games that do not use Three.js should not have to ship Three.js.

Architecture should allow:

```text
Game A
├── core
└── renderer-pixi

Game B
├── core
├── renderer-pixi
└── renderer-three
```

Avoid static imports that force optional renderers into every production bundle. Prefer explicit renderer registration or compatible lazy-loading mechanisms.

Games that never use 2D must not depend on Pixi. `project.json` `renderers` and scene `renderer` (`pixi` / `three` / `hybrid`) must match the package dependencies.

---

## Prefabs

`resolveGameProject` accepts `prefabsByPath` (project-relative `.prefab.json` modules) and builds a catalog keyed by catalogue `assetId`. Every bundled scene is resolved before it reaches `GameRuntime` / renderer adapters.

`GameRuntime.loadScene` also resolves prefab instances so standalone games and editor preview stay consistent. `collectSceneAssetIds` walks prefab documents with a visited set so indirect textures/scripts/Spine/glTF references are preloaded and cycles cannot loop.

Do not import editor packages from this resolution path.

## Script components

Game behaviours live under `games/<name>/src/components` or `packages/game-components`. They use `defineComponent` plus an OOP class that implements `ScriptInstance`. Class instances are not persisted in scene JSON.

`Script.enabled` (omit = true) is a scene-level flag. Disabled scripts are not constructed and do not receive `update`. This is independent of any `properties.enabled` field a behaviour may define.

See `.cursor/skills/create-game-component/SKILL.md`.
