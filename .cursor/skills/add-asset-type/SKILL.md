---
name: add-asset-type
description: >-
  Add a new supported asset format/type through catalogue schema, importer or
  editor workflow, project-server, Asset Browser, preview, Inspector picker,
  resolver, runtime load, and tests. Use when introducing a new AssetType,
  importer, generated artifact, or when import works but editor/runtime cannot
  resolve the file.
---

# Add Asset Type

Canonical workflow for a new **catalogue asset kind**. Scenes store stable `assetId`s (`asset_…`), never filesystem paths.

**Scenes are not assets.** Scene JSON lives at `games/<name>/assets/scenes/<fileId>.json` and is loaded via `SceneFileService` / `import.meta.glob`. Prefabs and TileSets *are* catalogue assets.

There is **no** first-class `spritesheet` `AssetType`. Packed sheets today come from Aseprite (`.generated/` PNG+JSON) or from ordinary `texture` files.

## When to use this skill

- Adding a new `AssetType` / metadata kind.
- Adding an importer (single file or multi-file bundle).
- Adding an editor-created catalogue document (pattern: prefab, tileset) rather than a file drop.
- Import succeeds but Browser / preview / Inspector / runtime cannot load it.

Do **not** use this for a new scene node that merely *references* an existing kind (that is `.cursor/skills/add-node-type/SKILL.md`).

## Before changing code

1. Confirm the kind does not already exist in `packages/assets/src/types.ts` (`AssetType`).
2. Decide the creation path:

| Path | Examples | Mechanism |
| --- | --- | --- |
| Per-file import | texture, audio, webfont, glb, aseprite | `AssetImporter` |
| Multi-file bundle | spine, bitmap font, multi-file glTF | `AssetBundleImporter` (runs first) |
| Editor workflow | prefab, tileset | `editor-prefab-workflows.ts` / `editor-tileset-workflows.ts` + project-server file service — **no** drop importer |

3. Read `docs/assets.md`. Aseprite-derived files: `docs/aseprite.md`. HTTP/path rules: `.cursor/rules/server-security.mdc` and `docs/project-server.md`.
4. Copy the closest existing kind end-to-end. Do not add a stub `AssetType` with no importer/metadata.

Current kinds: `texture`, `spine`, `audio`, `gltf`, `aseprite`, `font`, `webfont`, `prefab`, `tileset`.

## Implementation workflow

### 1. Domain model

- Extend `AssetType` and `AssetMetadata` in `packages/assets/src/types.ts`. Invariant: `record.type === metadata.kind`.
- Extend Zod in `packages/assets/src/schema.ts` (`assetTypeSchema`, metadata union, `assetRecordSchema`).
- Add `createXAssetRecord` in `packages/assets/src/factories.ts`.
- Extension helpers live beside the others (`texture-extensions.ts`, `audio-extensions.ts`, `spine-extensions.ts`, `gltf-extensions.ts`, `aseprite-extensions.ts`, …).
- Keep `ASSET_SCHEMA_VERSION` at 1 unless the manifest shape is incompatible — prefer optional fields / Zod `.default()` (see `gltf` `animations`).

### 2. Import (file kinds)

- Implement `AssetImporter` or `AssetBundleImporter` in `apps/project-server/src/services/` using `asset-importer.ts` contracts.
- Importers **must not write disk**. `AssetImportService` stages under the project's `.project/import-tmp/`, commits files, then atomically updates `games/<name>/.project/assets.json`.
- Register in `apps/project-server/src/index.ts` (`importerRegistry.register` / `registerBundle`).
- Enforce size/count limits (`import-limits.ts`). Never overwrite on name collision (`allocateUniqueFileName` / `allocateRelativePath`).
- Generated artifacts (Aseprite): source stays under `assets/`; derived PNG/JSON under `.generated/`; scenes store the **source** `assetId`.
- Discovery of unowned files: `AssetSyncService` uses the same registry. Skip `assets/scenes`.

### 3. Editor-created kinds (prefab / tileset pattern)

- Domain document + Zod (prefab: `packages/scene/src/prefab/`; tileset: `packages/assets/src/tileset.ts`).
- project-server file service (`prefab-file-service.ts`, `tileset-file-service.ts`).
- Editor workflow command/API (`createPrefabFromSelectedNode`, `createTileSetFromTexture`).
- Catalogue record still uses a stable `assetId`.

### 4. Resolver

- Extend `AssetResolver` in `packages/assets/src/asset-resolver.ts` only if the kind needs extra URLs (parts, atlas, generated sheet).
- Implement on `StaticAssetResolver` (`static-asset-resolver.ts`) and the editor `AssetManager`.
- Runtime preload: `packages/runtime/src/collect-scene-asset-urls.ts` and `preloadPixiSceneAsset` / `ThreeGltfCache` as applicable.

### 5. Editor UI

- Asset Browser: `apps/editor/src/assets/` (`AssetRow`, `AssetThumbnail`, `AssetContextMenu`). Folder logic stays in `packages/editor-core` (`asset-browser-model.ts`).
- Preview: `apps/editor/src/panels/AssetPreviewPanel.tsx` + `apps/editor/src/assets/*AssetPreview.tsx`.
- Drag into scene: `dropAssetOntoScene` in `asset-workflows.ts` (one command / one instantiate). Audio today is **rejected** on drop — that is intentional.
- Inspector pickers: `buildAssetSelectOptions`. Script fields: `COMPONENT_ASSET_TYPES` in `packages/game-components/src/types.ts` if scripts should pick the new kind.
- Rename/delete/duplicate: existing `RenameAssetCommand` / `DeleteAssetCommand` / `DuplicateAssetCommand` (async, `executeAsync`). Teach mutation services if owned sidecar files must move with the record.

### 6. Runtime loading

- Games resolve via `createStaticAssetResolver` in `packages/runtime/src/load-game-project.ts`.
- Pixi loads: `packages/renderer-pixi/src/preload-pixi-scene-asset.ts` (and kind-specific loaders: `load-spine.ts`, `load-pixi-spritesheet.ts`, `load-bitmap-font.ts`, `load-webfont.ts`).
- Three glTF: `packages/renderer-three/src/load-gltf.ts` + `three-gltf-cache.ts`.
- Audio playback: `packages/runtime/src/html-audio-player.ts` (no Pixi/Three).
- Shared scripts must call `ctx.services.resolveAssetUrl` / `preloadSceneAsset` — they must not import renderer packages.

### 7. Demo + tests

- Add a small fixture under `games/editor-features-demo` only if the kind is meant to be designer-visible.
- Tests: `packages/assets/src/*.test.ts`, importer tests next to the service (`texture-asset-importer.test.ts`, `spine-asset-importer.test.ts`, …), `asset-workflows.test.ts`, `router.assets.test.ts`. Use `mkdtemp` — never write into real `games/` folders.

## Representative implementations

| Kind | Importer / workflow | Preview | Runtime |
| --- | --- | --- | --- |
| texture | `texture-asset-importer.ts` | thumbnail URL | Pixi `Assets.load` |
| audio | `audio-asset-importer.ts` | `AudioAssetPreview.tsx` | `createHtmlAudioPlayer` |
| spine | `spine-asset-importer.ts` (bundle) | `SpineAssetPreview.tsx` | `load-spine.ts` |
| gltf | `gltf-asset-importer.ts` + `gltf-bundle-importer.ts` | `GltfAssetPreview.tsx` | `ThreeGltfCache` |
| aseprite | `aseprite-asset-importer.ts` + compile service | `AsepriteAssetPreview.tsx` | generated sheet via resolver |
| font | `bitmap-font-asset-importer.ts` (bundle) | page thumbnail | `load-bitmap-font.ts` |
| webfont | `webfont-asset-importer.ts` | CSS family | `load-webfont.ts` |
| prefab | `editor-prefab-workflows.ts` | instantiate on drop | `resolveScenePrefabs` |
| tileset | `editor-tileset-workflows.ts` | `TileSetAssetPreview.tsx` | `resolveTileSet` |

## Validation / Definition of Done

- [ ] `type === metadata.kind` enforced in Zod.
- [ ] Import or editor workflow is transactional (no orphan files / partial manifest).
- [ ] Browser, preview, picker, resolver, and runtime all understand the kind (or explicitly do not, with tests).
- [ ] Scene/prefab references are `assetId` only.
- [ ] Delete/rename cleans owned sidecar files (atlas pages, `.generated/`, buffers).
- [ ] Unsupported files surface per-file errors, not silent writes.
- [ ] Tests + typecheck for `@game-editor/assets`, `project-server`, and editor-core workflows.

## Common failure modes

- New `AssetType` in types but not registered on `AssetImporterRegistry` → drop/sync ignores the file.
- Bundle claimed as many texture records → Spine/font/glTF pages become separate assets and break ownership.
- Persisting a generated path on a Sprite/AnimatedSprite → Aseprite recompile breaks the scene.
- Resolver implemented only in the editor → standalone games 404.
- Writing files from `prepare()` → import rollback cannot unwind.
- Treating `assets/scenes/*.json` as importable assets → `importDroppedFiles` already rejects the scenes folder; do not reverse that.
- Skipping `ProjectRootGuard` / `ProjectService.resolveProjectPath` → path escape.
