---
name: modify-scene-schema
description: >-
  Safely change persisted scene, prefab, project, asset, or tileset JSON
  (Zod, TypeScript, defaults, loaders, backward compatibility, tests). Use when
  adding/removing/renaming serialized fields, bumping format versions, or
  loading old games/*/assets JSON would otherwise break.
---

# Modify Scene Schema

Strict workflow for **persisted** scene/project/asset formats. Prefer additive, backward-compatible changes.

Cross-package planning: `.cursor/skills/architecture-change/SKILL.md`. This skill is the format pipeline itself.

A new node type almost always touches this pipeline — complete `.cursor/skills/add-node-type/SKILL.md` as well. A new asset kind: `.cursor/skills/add-asset-type/SKILL.md`.

## When to use this skill

- Adding, renaming, removing, or tightening fields on scene/prefab/project/asset/tileset JSON.
- Changing unions (`ComponentData`, `AssetMetadata`, `renderer`).
- Old `games/*/assets/**/*.json` or `games/*/.project/assets.json` would fail `parse*` after the change.

Do **not** use this for editor-only UI prefs (`EDITOR_LAYOUT_VERSION`, scene-view settings) unless they are confused with scene JSON. Those live in `apps/editor/src/settings/editor-settings-storage.ts`.

## Before changing code

1. Identify **which document** changes:

| Document | Version const | Parse | Typical files |
| --- | --- | --- | --- |
| Scene | `SCENE_SCHEMA_VERSION` (`packages/scene/src/types.ts`) | `parseSceneData` | `games/*/assets/scenes/*.json` |
| Prefab | `PREFAB_SCHEMA_VERSION` (`packages/scene/src/prefab/types.ts`) | `parsePrefabData` | `games/*/assets/prefabs/**/*.prefab.json` |
| Project | `PROJECT_SCHEMA_VERSION` (`packages/project/src/types.ts`) | `parseProjectData` | `games/*/project.json` |
| Asset DB | `ASSET_SCHEMA_VERSION` (`packages/assets/src/types.ts`) | `parseAssetDatabase` | `games/*/.project/assets.json` |
| TileSet | `TILESET_SCHEMA_VERSION` (`packages/assets/src/tileset.ts`) | `parseTileSetData` | `*.tileset.json` |

All of these are currently **`version: 1`**.

2. There is **no scene/project/asset migration runner**. Roadmap (`docs/roadmap.md`, README “Schema migrations”) still lists one. Do **not** invent a `migrateSceneV2` API.

   Compatibility today is:

   - Optional fields on types/Zod.
   - Parse-time defaults: `packages/scene/src/scene-parse-defaults.ts` (`withSceneParseDefaults`); `parseProjectData` fills missing `startScene` / `resolution` / `background`.
   - Zod `.default()` on additive arrays (e.g. glTF `animations`).

3. Never persist `PIXI.*` / `THREE.*` / functions / class instances. Discriminated unions stay aligned between TypeScript and Zod (`.cursor/rules/typescript.mdc`).

## Implementation workflow

Follow this order. Do not skip “old JSON still parses”.

```text
schema
→ TypeScript types
→ defaults
→ serialization
→ deserialization
→ migration/backward compatibility
→ editor integration
→ runtime integration
→ fixtures
→ tests
→ docs if externally visible
```

### 1. Types then Zod (same PR)

- Scene components: `packages/scene/src/visual-components.ts` / `three-components.ts` / `types.ts` **and** `packages/scene/src/schema.ts` (`componentSchema` union).
- Prefab: `packages/scene/src/prefab/types.ts` + `prefab/schema.ts`.
- Project: `packages/project/src/types.ts` + `schema.ts`.
- Assets: `packages/assets/src/types.ts` + `schema.ts`.

Keep `type` / `kind` discriminants identical.

### 2. Defaults and factories

- Scene field defaults: `packages/scene/src/defaults.ts` + `packages/scene/src/factories/`.
- Parse defaults for **already-written files**: `withSceneParseDefaults` or `parseProjectData` fillers.
- Factory output for **new** documents must include the new field (or omit it when omitted-means-default, e.g. `visible`, `alpha`).

### 3. Serialization

There is no `serializeSceneData`. Scenes are written as pretty JSON + trailing newline in `apps/project-server/src/services/scene-file-service.ts` (`JSON.stringify(validated, null, 2)`).

Prefabs: `serializePrefabData`. Asset DB: `serializeAssetDatabase` (assets sorted by id). TileSets: `serializeTileSetData`.

Keep output deterministic and Git-friendly (no insertion-order churn, no transient runtime fields).

### 4. Backward compatibility

**Additive (preferred):** optional field or parse default. Keep `SCENE_SCHEMA_VERSION` at 1. Load every existing demo scene.

**Incompatible (rename/remove/change meaning):** you must bump the matching `*_SCHEMA_VERSION` **and** add an explicit migration story. Until a runner exists, that means:

- Implement a documented upgrade function next to the parser (or refuse to land the break).
- Add fixtures for v1 (old) and vN (new) in `schema.test.ts` / `prefab.test.ts` / `packages/project/src/schema.test.ts` / `packages/assets/src/asset-database.test.ts`.
- Update every committed JSON under `games/*/assets` and `.project/` in the same change, or the editor/runtime cannot open those games.

Silently breaking old projects is not allowed.

### 5. Editor + runtime

- Editor loads/saves through project-server (`parseSceneData` before write).
- Runtime: `packages/runtime/src/load-game-project.ts` (`parseSceneData`, `parsePrefabData`, `parseProjectData`, `parseAssetDatabase`).
- Queries, asset-refs, prefab overrides (`packages/scene/src/prefab/overrides.ts`), Inspector, and renderers must understand the new field.
- Demo snapshot: `apps/editor/src/demo/` if in-memory demo JSON embeds scenes.

### 6. Tests and docs

- Round-trip: `parseSceneData(JSON.parse(JSON.stringify(scene)))`.
- Reject invalid shapes.
- Old payloads with missing new keys still parse.
- User-visible format: `docs/scene-model.md` / `docs/assets.md` — only if those pages would be wrong. Do not edit `docs/roadmap.md` just to note the field.

## Representative implementations

| Pattern | Where |
| --- | --- |
| New required-looking field with parse fill | `withSceneParseDefaults` (`Model3D` loop/timeScale/playing; Text style) |
| Omitted = default on disk | `visible`, `alpha`, `renderer` on `SceneData` |
| Project missing keys | `parseProjectData` |
| Additive metadata | glTF `animations` Zod `.default([])` |
| Prefab document | `parsePrefabData` / `serializePrefabData` |
| UI prefs migration (not scene) | `editor-settings-storage.ts` v1 `{ snapToGrid }` → v2 |

Tests: `packages/scene/src/schema.test.ts`, `prefab/prefab.test.ts`, `packages/project/src/schema.test.ts`, `packages/assets/src/asset-database.test.ts`.

## Validation / Definition of Done

- [ ] TypeScript unions and Zod discriminants match.
- [ ] Factories emit valid documents at the current version.
- [ ] Existing committed JSON still parses (or was migrated in-repo).
- [ ] Runtime and editor loaders share the same `parse*` functions.
- [ ] No Pixi/Three/functions in JSON.
- [ ] Schema tests cover accept + reject + round-trip.
- [ ] Version bumped **only** for incompatible changes, with a real upgrade path.

## Common failure modes

- Updating types but not `componentSchema` → runtime accepts invalid files or rejects valid editor saves.
- New required Zod field without parse defaults → `editor-features-demo` scenes fail CI/load.
- Bumping `SCENE_SCHEMA_VERSION` without rewriting `games/*/assets/scenes` → `isCurrentSceneSchemaVersion` lies and nothing migrates.
- Inventing a migration runner in one package but not wiring `parseSceneData` / project-server / `load-game-project`.
- Persisting Inspector draft strings or renderer object ids.
- Changing asset `id`s instead of adding fields — scenes would dangle.
