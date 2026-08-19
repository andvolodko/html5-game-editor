---
name: add-node-type
description: >-
  Add a new scene node type end-to-end (domain component, Zod schema, factory,
  editor registry, Inspector, Pixi/Three renderer, clone/undo, tests). Use when
  adding a creatable Hierarchy/Node-menu type, visual or Three leaf, Hit Zone /
  Mask-like extra, or when schema is added but renderer/editor support is missing.
---

# Add Node Type

Canonical workflow for a new **scene node type** (component composition, not a JS class hierarchy). Do **not** invent a parallel node-type inheritance tree.

Script behaviours (`defineComponent`) are **not** node types — use `.cursor/skills/create-game-component/SKILL.md`.

Persisted format changes: also follow `.cursor/skills/modify-scene-schema/SKILL.md`.

## When to use this skill

- Adding a creatable type to Hierarchy / Toolbar Node menu (`pixi.*` / `three.*` ids).
- Adding a new leaf visual (`Sprite`-like) or leaf Three component (`Model3D`-like).
- Adding an extra on Transform2D nodes (pattern: Hit Zone, Mask — not leaves).
- A type exists in schema but menus, Inspector, renderer, or clone/undo are incomplete.

## Before changing code

1. Search for the **closest existing type** and copy that vertical slice. Do not design a new registration style.
2. Classify the type:

| Kind | Domain | Registry id | Children |
| --- | --- | --- | --- |
| 2D leaf visual | `packages/scene/src/visual-components.ts` | `pixi.<kebab>` | no |
| 2D container | Transform2D only | `pixi.container` | yes |
| Extra on 2D node | `hit-zone-component.ts` / `mask-component.ts` | `pixi.hit-zone` / `pixi.mask` | Hit Zone/Mask nodes yes; adding onto a leaf does not change leaf parenting |
| 3D leaf | `packages/scene/src/three-components.ts` | `three.<kebab>` | no |
| 3D container | Transform3D only | `three.container` | yes |

3. Confirm it is **not** a Script (`type: "Script"`). Scripts reuse `createScriptComponent`.
4. Read `docs/scene-model.md` (How to extend) and `docs/renderers.md`. Follow `.cursor/rules/architecture.mdc` and `.cursor/rules/class-size.mdc` (keep visual-components → schema → factories → node-types → painters → Inspector aligned, one category per file).

**Never ship a partial type.** Schema without renderer, menu, Inspector, clone, or tests is incomplete.

## Implementation workflow

Copy this checklist and complete it in order. Skip a layer only when the closest existing type also skips it (and document why).

### 1. Domain type + defaults

- Add the `type: "PascalName"` interface and union member.
- Add named defaults in `packages/scene/src/defaults.ts` (no unexplained literals).
- If it is a leaf: add to `LEAF_VISUAL_COMPONENT_TYPES` or `LEAF_THREE_COMPONENT_TYPES`.
- Teach `packages/scene/src/node-capabilities.ts` (`getNodeTypeId`, `nodeCanHaveChildren`).
- If it stores `assetId` (or font/tile-set ids): teach `packages/scene/src/asset-refs.ts`.

### 2. Zod + parse defaults

- Add a Zod object in `packages/scene/src/schema.ts` with the same `type` discriminant.
- Include it in `componentSchema`.
- Older JSON: fill new required fields in `packages/scene/src/scene-parse-defaults.ts` (`withSceneParseDefaults`) so existing projects still parse. Do **not** bump `SCENE_SCHEMA_VERSION` for additive optional fields.

### 3. Factory

- Add `createXComponent` / `createXNode` in `packages/scene/src/factories/` and re-export from `packages/scene/src/factories.ts`.
- Use `createId("comp")` / `createId("node")` via existing helpers (`createNodeWithVisual`, `createNodeWithTransform3D`).
- Persist `assetId`s, never filesystem paths.

### 4. Editor registry (create menu)

- Add a `NodeTypeDefinition` next to the matching category file under `packages/editor-core/src/node-types/pixi/` or `three-definitions.ts`.
- Register it from `pixi-definitions.ts` / `three-definitions.ts`.
- `CreateNodeCommand` already creates from the registry — do **not** add a one-off create command unless the closest type has one (legacy: `CreateSpriteCommand`).
- Toolbar Node menu: `apps/editor/src/panels/Toolbar.tsx` (`listRendererMenuGroups`). Hierarchy create uses `editor.createNode`.
- If the type accepts a drop: `supportedAssetTypes` plus `packages/editor-core/src/asset-workflows.ts` (`dropAssetOntoScene`).

### 5. Inspector

- 2D visuals: `apps/editor/src/panels/visual-fields/<category>.tsx` + switch in `VisualComponentInspector.tsx`.
- 3D: dedicated inspector (`Model3DInspector.tsx`, `PerspectiveCameraInspector.tsx`, `ThreeLightInspector.tsx`) mounted from `InspectorPanel.tsx`.
- Asset pickers: `apps/editor/src/panels/fields/asset-select-options.ts` (`buildAssetSelectOptions`).
- Commit via `editor.setVisualComponent` / `editor.setModel3D` / existing `Set*Command` façades — never mutate the scene from React.

### 6. Renderer

- **Pixi leaf:** `packages/renderer-pixi/src/visuals/painters/<name>.ts` and register in `painter-registry.ts`. Runtime graph: `pixi-runtime-nodes.ts` (`RuntimeNode`). Editor chrome stays out of playback.
- **Three leaf:** `packages/renderer-three/src/three-scene-renderer.ts` + `three-runtime-nodes.ts` (`ThreeRuntimeGraph`). Do not put `THREE.*` on scene JSON.
- Implement incremental `SceneRenderer` ops (`createNode` / `updateNode` / `destroyNode` / `reparentNode` / `syncTransform`). Full `clear`+rebuild is load/recovery only (`packages/scene/src/scene-renderer.ts`).
- Viewport sync is `EditorViewportController` — domain mutations already flow there; do not call Pixi/Three from React.

### 7. Clone, duplicate, undo

- `cloneNodeSubtree` in `packages/scene/src/node-ops.ts` deep-copies components; new component fields must be plain JSON.
- Duplicate: `DuplicateNodeCommand`. Create/undo: `CreateNodeCommand` stores the node and restores selection.
- Prefab instances: inherited children cannot be duplicated without Unpack (`prefab-structure.ts`).

### 8. Demo + docs

- If the type is user-visible, add a small example in `games/editor-features-demo/assets/scenes/` (see `spine.json`, `world3d.json`, `text.json`, `hybrid.json`). Do not copy large binary assets unless required.
- Update `docs/renderers.md` node-type table and `docs/scene-model.md` only if the public list would otherwise be wrong.

## Representative implementations

| Goal | Copy |
| --- | --- |
| Texture-backed 2D leaf | Sprite: `visual-components.ts`, `factories/sprites.ts`, `node-types/pixi/sprites.ts`, `visuals/painters/sprite.ts`, `visual-fields/sprites.tsx` |
| 2D extra (not a leaf) | Hit Zone: `hit-zone-component.ts`, `factories/hit-zone.ts`, `node-types/pixi/hit-zone.ts`, `HitZoneInspector.tsx`, `AddHitZoneCommand` |
| 3D leaf | Model3D: `three-components.ts`, `factories/three.ts`, `node-types/three-definitions.ts`, `three-scene-renderer.ts`, `Model3DInspector.tsx` |
| Tile grid | Tilemap: `tilemap-data.ts`, `node-types/pixi/tilemap.ts`, `visuals/painters/tilemap.ts` |

Tests to extend: `packages/scene/src/schema.test.ts`, `packages/scene/src/node-types.test.ts`, `packages/editor-core/src/node-types/node-type-registry.test.ts`, `packages/editor-core/src/commands.test.ts`, renderer painter tests under `packages/renderer-pixi/src/visuals/`.

## Validation / Definition of Done

- [ ] Type appears in Node menu (unless `creatable: false`) and creates via `CreateNodeCommand`.
- [ ] `parseSceneData` accepts new JSON; old scenes still parse.
- [ ] Factory defaults are named constants; ids use `createId`.
- [ ] Inspector can view/edit fields; commits go through commands.
- [ ] Matching renderer paints, updates, and destroys without leaking objects.
- [ ] Duplicate / undo / redo work; selection restores.
- [ ] Asset references use `assetId`; `collectReferencedAssetIds` sees them.
- [ ] `pnpm --filter @game-editor/scene test` (and editor-core / renderer package tests) plus typecheck for touched packages.

## Common failure modes

- Schema added, renderer painter not registered → warning `[renderer] no painter for visual type` and empty viewport.
- Leaf not added to `LEAF_*` → Hierarchy allows children on a renderable, parenting breaks.
- `assetId` stored as a path → violates core invariants; runtime/resolver cannot load it.
- New required Zod field without `withSceneParseDefaults` → existing `games/*/assets/scenes/*.json` fail to load.
- React mutating `PIXI.*` / `THREE.*` or the scene tree directly → undo and viewport sync diverge.
- One-off `CreateFooCommand` instead of `NodeTypeRegistry` → menus and drop-asset miss the type.
- Putting Pixi/Three types in `packages/scene` → domain/runtime split is broken.
