# Aseprite assets

Editor support for Aseprite / LibreSprite source files (`.aseprite`, `.ase`).

The source file is the catalogue record. Compiled PNG + PixiJS JSON are derived artifacts. Scene files store a stable `assetId` and optional animation tag name — never a `.generated/` path.

Operator overview also lives in the root [`README.md`](../README.md#aseprite-assets). Architecture invariants: [`PROJECT.md`](../PROJECT.md) §§14–18, 48.

## Pipeline

```text
.aseprite / .ase
    ↓
AsepriteAssetImporter
    ↓
AsepriteCompileService  (cache: mtime + size)
    ↓
AsepriteService         (CLI: aseprite or libresprite)
    ↓
.generated/...png + .generated/...json
    ↓
Asset resolver  →  Pixi spritesheet
```

UI and renderer packages must not spawn `child_process`. CLI detection and export live in `apps/project-server`.

## Source vs generated

```text
games/<name>/assets/characters/hero.aseprite
  → games/<name>/.generated/assets/characters/hero.png
  → games/<name>/.generated/assets/characters/hero.json
```

| Kind | Location | In Assets panel | In Git | In game build |
| --- | --- | --- | --- | --- |
| Source | `assets/**/*.aseprite` | Yes (`type: "aseprite"`) | Yes | No (not required at runtime) |
| Derived | `.generated/**/*.png\|json` | Hidden | Yes (CI/Pages have no Aseprite CLI) | Yes (copied by game Vite plugin) |
| Cache | `.project/aseprite-cache.json` | No | Ignored | No |
| Undo trash | `.generated/asset-trash/`, `.generated/folder-trash/` | Hidden | Ignored | No |

Unchanged sources skip the CLI when mtime and size match the cache and both generated files still exist. `compileRevision` is appended to editor URLs so existing nodes refresh without a full scene reload.

## CLI detection

Editor/build-time only. Players never need Aseprite.

Lookup order:

1. `ASEPRITE` environment variable (absolute path to `aseprite` or `libresprite`)
2. `PATH` (`aseprite`, `Aseprite.exe`, `libresprite`, `libresprite.exe`)
3. Well-known folders (Program Files, Steam, `%LOCALAPPDATA%\Programs\Aseprite`, `%LOCALAPPDATA%\Programs\LibreSprite`, macOS `/Applications`, `/usr/bin`)

Aseprite is paid. The free [LibreSprite](https://github.com/LibreSprite/LibreSprite) fork is enough for packed spritesheet + tag export. Official Windows zip: [LibreSprite releases](https://github.com/LibreSprite/LibreSprite/releases). A typical path:

```text
%LOCALAPPDATA%\Programs\LibreSprite\libresprite.exe
```

Restart `pnpm dev` after installing a CLI so project-server re-resolves the executable.

Missing CLI does not crash the editor. The asset record stores `compileError` and the Assets preview shows:

```text
Aseprite CLI was not found.

Install Aseprite or the free LibreSprite fork, and make sure `aseprite` or `libresprite` is available in PATH (or set the ASEPRITE environment variable).
```

Export flags (same for Aseprite and LibreSprite):

```text
--batch --sheet --data --format json-array --list-tags --sheet-pack
```

CLI JSON is normalized once in `@game-editor/assets` (`aseprite-json.ts`). The rest of the app uses `AsepriteAssetMetadata` (tags, frameCount, durations) plus Pixi spritesheet JSON (`meta.image` = PNG basename).

## Editor

- Assets panel lists the source file as **Aseprite Sprite**. Select it to play tags in the **Asset Preview** panel (below Inspector); otherwise the first frame.
- Drag into the scene: one frame → Sprite; tags or multiple frames → AnimatedSprite (first tag, `playing: true`).
- Inspector: **Animation** dropdown from tags, plus `animationSpeed`, `loop`, `playing`.

Serialized AnimatedSprite (logical ids, not generated paths):

```json
{
  "type": "AnimatedSprite",
  "assetId": "asset_hero",
  "animation": "idle",
  "animationSpeed": 1,
  "loop": true,
  "playing": true
}
```

Pixi maps tags to `spritesheet.animations[tagName]`. Reverse and ping-pong tags are expanded in that list.

## Runtime / export

`createStaticAssetResolver` maps an Aseprite `assetId` to `/.generated/...json` and the sibling PNG. Game Vite copies `.generated` into `dist`. The static editor demo copies the same tree under `/demo/<projectId>/.generated`. Derived PNG/JSON are committed so GitHub Actions can build Pages without installing Aseprite. After changing a source `.aseprite`, regenerate locally and commit the matching PNG/JSON. Players never need the CLI.

## Tests

Unit tests mock the CLI. Coverage includes importer detection, metadata/tags, cache skip vs mtime rebuild, missing CLI, and scene persistence of `assetId` + `animation`.
