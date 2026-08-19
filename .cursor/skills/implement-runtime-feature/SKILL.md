---
name: implement-runtime-feature
description: >-
  Implement gameplay/runtime features (GameRuntime services, input, audio,
  timers, scene transitions, script lifecycle, shared game systems) without
  importing editor UI. Use when changing runtime packages or games/* behaviour
  that is not a new Script component and not editor chrome.
---

# Implement Runtime Feature

Counterpart to `.cursor/skills/implement-editor-feature/SKILL.md` for work that ships in **games**, not the editor shell.

New Script components (`defineComponent` + behaviour class): use `.cursor/skills/create-game-component/SKILL.md` instead — do not duplicate that OOP/catalog checklist here.

New independently buildable game package: `.cursor/skills/create-game/SKILL.md`.

## When to use this skill

- Gameplay services on `GameRuntime` / `ScriptRuntimeServices` (audio, preload, spawn, scene change, pointer forwarding).
- Runtime scene host behaviour (`ScriptHost` lifecycle, tick, pause).
- Shared renderer-agnostic systems in `packages/runtime` or `packages/game-components`.
- Input/audio/timers used by multiple scripts.
- Scene transitions and asset preload for standalone builds / Preview.

Do **not** use this for Inspector, docking, undo commands, or project-server routes.

## Before changing code

1. Name the layer. Runtime-safe code must **not** import:

   - `apps/editor`, `@game-editor/editor-core`
   - React
   - `apps/project-server`
   - Pixi/Three from `packages/game-components` shared scripts

2. If the feature is renderer-specific, put it in `packages/renderer-pixi` or `packages/renderer-three`. Games that do not use that renderer must not gain a static import (see `docs/runtime.md`).

3. Read only `docs/runtime.md` plus, if needed, `docs/renderers.md` / `docs/scene-model.md`. Follow `.cursor/rules/core.mdc` dependency direction.

4. Inspect `packages/runtime/src/game-runtime.ts` and `packages/game-components/src/types.ts` (`ScriptRuntimeServices`) before adding a parallel service locator.

## Implementation workflow

### 1. Choose the package

| Need | Package |
| --- | --- |
| Tick, load scene, register renderers, script host | `packages/runtime` (`GameRuntime`, `ScriptHost`, `load-game-project.ts`) |
| Service API consumed by scripts | `ScriptRuntimeServices` in `packages/game-components/src/types.ts`; implement on `GameRuntime` |
| Audio | `packages/runtime/src/html-audio-player.ts` (HTMLAudioElement; no Pixi) |
| Pointer forwarding | `GameRuntime.emitNodeClick` / `emitNodePointerEvent`; editor preview: `playback-overlay-pointer.ts` |
| Spawn/clone at runtime (not persisted) | `script-scene-spawn.ts`, `script-scene-clone.ts` |
| Scene I/O patches for scripts | `script-scene-io.ts` (transforms, Model3D playback, sprite asset) |
| Shared behaviour | `packages/game-components/src/shared/` via create-game-component |
| Game-specific behaviour | `games/<name>/src/components/` via create-game-component |
| Pixi/Three object mapping | `pixi-runtime-nodes.ts` / `three-runtime-nodes.ts` — never stored on `SceneData` |

Boot wiring for a game: `games/<name>/src/main.ts` + `mount-renderers.ts`. Editor Preview mirrors that in `apps/editor/src/preview/game-preview-session.ts` (this file may import renderers; game shared scripts still must not).

### 2. Scene data vs runtime-only state

- Persisted fields belong on components / `SceneData` and need `.cursor/skills/modify-scene-schema/SKILL.md` if the JSON shape changes.
- Live instances, mixers, HTMLAudioElements, click handlers stay off the graph. `ScriptHost` already keeps `ScriptInstance`s off `SceneData`.
- Runtime `setTransform2D` on services updates the in-memory scene + renderer sync; it does **not** go through editor commands and must not be used from React panels.

### 3. Implement the smallest slice

- Extend existing `ScriptRuntimeServices` optionals rather than a new global singleton.
- Scripts subscribe in `start()` and unsubscribe in `destroy()` (create-game-component class rules).
- Use `changeScene(sceneId)` with scene **file ids**, never FS paths.
- Preload through `preloadSceneAsset` / `collectSceneAssetIds` so Preview and standalone games stay consistent.
- Prefer incremental `SceneRenderer` ops. `clear`+recreate is load/recovery only.

### 4. Keep Pixi and Three optional

- `GameRuntime` registers renderers explicitly (`RuntimeRendererRegistration`).
- Hybrid filtering uses `nodeBelongsToPixiBackground` / `Foreground` / `nodeBelongsToThree` in scene helpers.
- Do not add a `renderer-three` import to a Pixi-only game (`games/example-game-2`, `games/solitaire`).

### 5. Tests

Unit-test runtime packages without React:

- `packages/runtime/src/game-runtime.test.ts`
- `script-host` coverage via game-runtime / script-scene-* tests
- `html-audio-player.test.ts`, `collect-scene-asset-urls.test.ts`, `load-game-project.test.ts`

Do not boot Pixi/Three unless the test is in a renderer package.

## Representative implementations

| Feature | Start here |
| --- | --- |
| Scene load + tick | `packages/runtime/src/game-runtime.ts` |
| Script lifecycle | `packages/runtime/src/script-host.ts` |
| Audio | `html-audio-player.ts`; scripts call `ctx.services.playAudio` (`packages/game-components/src/shared/audio-click.ts`) |
| Scene change | `ctx.services.changeScene`; `packages/game-components/src/shared/change-scene.ts` |
| Performance overlay | `packages/game-components/src/shared/performance-meter.ts` + `SceneRenderStats` |
| Hybrid mount | `games/editor-features-demo/src/mount-renderers.ts` |
| Preview host | `apps/editor/src/preview/game-preview-session.ts` |

## Validation / Definition of Done

- [ ] No editor/React/project-server imports from runtime or `games/*/src` gameplay code.
- [ ] Shared components remain renderer-agnostic.
- [ ] Optional renderer stays optional in the affected game’s `package.json`.
- [ ] Scene JSON unchanged unless a schema skill was followed.
- [ ] Script instances still not persisted.
- [ ] Preview and standalone boot both receive the new service (or it is clearly editor-only in `game-preview-session.ts`).
- [ ] Tests + `pnpm --filter @game-editor/runtime test` and the affected game `typecheck`.

## Common failure modes

- Importing `@game-editor/editor-core` from a game → standalone build pulls the editor.
- Importing `pixi.js` from `packages/game-components/src/shared` → Three-only games break; scripts must use services.
- Writing live `THREE.AnimationMixer` into `Model3DComponentData` → serialization fails / Git noise.
- Hardcoding `assets/scenes/main.json` paths instead of scene file ids.
- Adding a service only on Preview and not `games/<name>/src/main.ts` (or the reverse).
- Per-frame allocations in `ScriptInstance.update` without a measured need — see `.cursor/skills/performance-audit/SKILL.md`.
