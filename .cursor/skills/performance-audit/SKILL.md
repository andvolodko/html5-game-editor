---
name: performance-audit
description: >-
  Measure and fix editor or runtime performance regressions (per-frame work,
  Pixi/Three loops, React rerenders, scene rebuilds, allocations). Use when
  investigating jank, GC pressure, high draw calls, or before optimizing hot
  paths — not for speculative micro-edits.
---

# Performance Audit

Measurement-first workflow. Do not change architecture on a hunch.

Architecture constraints: `docs/architecture.md` (Performance) and `.cursor/rules/core.mdc`. Editor viewport rules: `.cursor/rules/editor-ui.mdc`.

## When to use this skill

- Editor Scene/Preview jank, hitching, or memory growth.
- Game runtime FPS drops, GC spikes, or high `Performance Meter` stats.
- A change is suspected of rebuilding the whole scene graph or re-rendering React every ticker frame.
- User asks to “optimize” without a measured hot path.

Do **not** use this to sprinkle caches through unrelated modules.

## Before changing code

1. **Reproduce** the slow case with a concrete scene (demo `games/editor-features-demo/assets/scenes/perfomance-test.json` exists for load; also `hybrid.json` / `world3d.json` / Spine scenes).
2. **Identify the hot path** (editor viewport vs Preview/`GameRuntime` vs Asset Browser vs Inspector).
3. **Establish a baseline** (FPS, frame time, draw calls, display object counts, allocations). Guessing is not a baseline.
4. Read the existing sync model: `EditorViewportController` is incremental; `SceneRenderer.clear` is load/recovery only (`packages/scene/src/scene-renderer.ts`).

This repo does **not** use Zustand. Editor UI subscribes via `useEditorState` → `editor.getStoreVersion()` (`apps/editor/src/hooks/useEditorState.ts`).

## Audit workflow

```text
reproduce
→ identify hot path
→ establish baseline
→ inspect architecture
→ implement smallest safe optimization
→ verify behavior
→ compare before/after
→ add regression test where practical
```

### 1. Reproduce and classify

| Surface | Typical cost |
| --- | --- |
| Editor Scene | Pixi/Three update + gizmos + selection chrome |
| Preview / game | `GameRuntime.tick` → scripts `update` → `renderer.render` |
| React shell | `editor.subscribe` notifying every panel |
| Assets | import, thumbnail decode, preview hosts |
| Persistence | `JSON.stringify` of the whole scene (save, not per frame) |

### 2. Baseline (what already exists)

- Script overlay: `shared.PerformanceMeter` (`packages/game-components/src/shared/performance-meter.ts`) reads `ScriptPerformanceStats` from `GameRuntime` (frame time, FPS, `gameLogicMs`, `rendererMs`, draw calls, triangles, display objects, optional `pixi` / `three` splits).
- Renderer samplers: `packages/renderer-pixi/src/pixi-render-stats.ts`, `packages/renderer-three/src/three-render-stats.ts`.
- Browser Performance panel / Chrome Memory for allocation timelines. Do not add a new profiler stack unless the user asked for a Profiler **panel** (that would be `.cursor/skills/add-editor-panel/SKILL.md`).

Record numbers before editing.

### 3. Inspect architecture (common hot spots in *this* repo)

Search and instrument before rewriting:

- Per-frame allocations in `ScriptInstance.update`, painters, or transform adapters (`getRuntimeTransform2D` must not allocate a new handle each access — `SceneRenderer` contract).
- Pixi ticker / `PixiSceneRenderer` rebuild vs `updateNode` / `syncTransform`.
- Three mixer/update in `three-scene-renderer.ts` / `three-model-animation.ts`.
- Full graph rebuild: `EditorViewportController.rebuild` / `fullRebuildCount`; mutation `kind: "reload"`.
- React: `useEditorState` without a narrow selector; copying `getScene()` into local state; per-frame drag through React (forbidden — preview on renderer, one `SetTransform2DCommand` on pointer-up).
- `pointermove` handlers allocating; gizmo/hit-zone drag preview vs commit.
- `JSON.stringify` / structuredClone of scenes inside tick or subscribe handlers.
- Texture / glTF churn: `pixi-texture-cache.ts`, `three-gltf-cache.ts`, `tile-texture-cache.ts` — evict on asset change, do not reload every paint.
- Event listener / ticker leaks (missing destroy in `ScriptHost`, Preview session, ScenePanel effect).
- `JSON.stringify` of script properties every frame (`ScriptHost` uses a properties key — do not make that hotter without evidence).

Preserve readability. Named constants stay (`.cursor/rules/no-magic-numbers.mdc`).

### 4. Smallest safe fix

Prefer, in order:

1. Stop doing the work (narrow subscription, skip paint when data unchanged).
2. Incremental renderer ops instead of `clear`+create.
3. Reuse objects (scratch `Vec2`, cached stats).
4. Only then: caches, batching, structural change.

Do not micro-optimize loops without a profile showing them on the hot path.

### 5. Verify

- Behaviour: selection, undo, save/load, hybrid layers, pause/preview still work.
- Compare the same baseline metrics.
- Add a regression test only when the bug is deterministic without a GPU (pure math, mutation kind, cache eviction, “rebuild not called on transform”). Do not snapshot FPS.

## Representative implementations

| Area | Files |
| --- | --- |
| Incremental editor sync | `packages/editor-core/src/viewport-controller.ts` |
| Renderer port | `packages/scene/src/scene-renderer.ts` |
| Pixi runtime nodes | `packages/renderer-pixi/src/pixi-runtime-nodes.ts`, `pixi-scene-renderer.ts` |
| Stats | `pixi-render-stats.ts`, `three-render-stats.ts`, `performance-meter.ts` |
| Preview mount/dispose | `apps/editor/src/preview/game-preview-session.ts` |
| Drag preview | editor-ui rule: `previewNodePosition` then one transform command |

## Validation / Definition of Done

- [ ] Slow case reproduced and baseline recorded.
- [ ] Hot path identified in *this* codebase (file/function).
- [ ] Fix is the smallest change that moves the baseline.
- [ ] Undo/load/preview behaviour unchanged (or covered by tests).
- [ ] Before/after metrics reported; no drive-by refactors.
- [ ] Relevant package tests still pass.

## Common failure modes

- “Optimizing” by rebuilding less in the wrong layer while React still re-renders every `getStoreVersion()` bump.
- Caching scene JSON in a panel → stale Inspector.
- Recreating `PIXI.Sprite` / `THREE.Object3D` on every `updateNode` instead of patching.
- Putting `Performance.now()` logs in production tick without a way to disable them.
- Changing serialized defaults to avoid allocations (that is a schema change; do not hide it here).
- Measuring a development Vite build and treating it as ship FPS without noting that.
