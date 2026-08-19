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

Standalone `vite build` uses a relative `base` (`./`) so `bundle/` and `assets/` resolve next to `index.html`. That is required for zip hosts such as itch.io. `pnpm build:pages` still sets `VITE_BASE` to `/<repo>/games/<id>/` for GitHub Pages.

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

`GameRuntime.loadScene` also resolves prefab instances so standalone games and editor preview stay consistent. `collectSceneAssetIds` walks prefab documents with a visited set so indirect textures, Script property assets, Spine/glTF references are preloaded and cycles cannot loop.

**Load All Scene Assets** (`shared.LoadAllSceneAssets`) lists those ids and calls `preloadSceneAsset`. **Loading Scene** (game-local) must wait for that component’s `completeEvent` **and** `minDisplayMs` before `changeScene`. Do not navigate on a timer alone — that aborts preload.

Standalone `changeScene` / Preview reuse the mounted Pixi/Three/hybrid stack when `getSceneRendererKind` is unchanged (`renderer.clear` + `createNode`). Remount only when the kind changes (for example pixi → hybrid). Preloaded Pixi URLs stay pinned in `Assets` so a remount does not `Assets.unload` them.

Do not import editor packages from this resolution path.

## Script components

Game behaviours live under `games/<name>/src/components` or `packages/game-components`. They use `defineComponent` plus an OOP class that implements `ScriptInstance`. Class instances are not persisted in scene JSON.

`Script.enabled` (omit = true) is a scene-level flag. Disabled scripts are not constructed and do not receive `update`. This is independent of any `properties.enabled` field a behaviour may define.

Lifecycle on `ScriptInstance` (all hooks optional):

```text
constructor → start() once (node + ctx.transform ready)
           → update(dt) each GameRuntime.tick
           → onPropertiesChanged(properties) on live Inspector edits
           → destroy() once on unload
```

`GameRuntime.setPaused(true)` skips `tick` / playback pointer events and calls `SceneRenderer.setPlaybackPaused` so Pixi tickers and glTF mixers freeze. Spine and AnimatedSprite (Aseprite) attach to Pixi `Ticker.shared` by default; preview pause detaches them and drives updates from the Application ticker instead. Inspector `onPropertiesChanged` still runs. Editor preview Pause uses this plus `HtmlAudioPlayer.setPaused`.

`ScriptHost` isolates hook errors (script id, component id, node id, hook name) so one broken behaviour does not stop the rest of the loop.

Own-node 2D motion should use `ctx.transform` (a persistent live handle: `x` / `y` or `position` / `scale`). Do not call `getTransform2D` / `setTransform2D` every frame for the host node.

Own-node 3D motion should use `ctx.transform3D` (`position` / `rotation` / `scale` live axes plus `setPosition` / `setRotation` / `setScale` / `set`). Model clips on the host node should use `ctx.animations` (`play`, `stop`, `isPlaying`, `duration`, `names`). Catalogue audio should use `ctx.audio`. Host-node visibility and lookup should use `ctx.node` / `ctx.scene`. AnimatedSprite (Aseprite) clips use `ctx.services.setAnimatedSpritePlayback`. `ctx.services` remains the low-level escape hatch (other nodes, spawn, scene graph, …).

Metadata catalogs stay function-free. After a catalog load, games call `registry.attachRuntime(componentId, create)` from `installGameRuntime`.

Per-node deterministic values: `seededUnitFloat(seed, salt)` in `@game-editor/shared` / `@game-editor/game-components` (`[0, 1)`).

See `.cursor/skills/create-game-component/SKILL.md`.
