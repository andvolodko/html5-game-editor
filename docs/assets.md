# Assets

Asset database, browser, import pipeline, atlas generation, and generated files.

Orientation: [`PROJECT.md`](../PROJECT.md). Aseprite CLI details: [`aseprite.md`](./aseprite.md). Server import security: [`project-server.md`](./project-server.md).

---

## Asset database

Assets are metadata records with stable IDs:

```ts
interface AssetRecord {
  id: string;
  type: AssetType;
  path: string;
  name: string;
  metadata?: Record<string, unknown>;
}
```

Possible types: `texture`, `spritesheet`, `aseprite`, `model3d`, `audio`, `font`, `webfont`, `spine`, `environment`, `scene`, `prefab`.

`aseprite` records point at the source `.aseprite` / `.ase` path. Derived PNG/JSON live under `.generated/` and are not catalogue entries. Scenes must store the Aseprite `assetId` (and optional tag `animation`), never a generated filesystem path.

Asset IDs remain stable after rename, move, or folder restructuring. Scenes reference IDs. Path changes are handled by AssetDatabase.

---

## Asset browser

The Asset Browser should behave like a simplified file explorer: folders, search, multi-selection, rename, delete, duplicate, move, context menu, drag-and-drop, create folder, preview.

External OS files may be dropped into the browser:

```text
OS File Explorer
      ↓
Browser Editor
      ↓
Project Server
      ↓
Asset Import Pipeline
      ↓
Asset Database
```

Never trust filenames or paths received from the browser.

Asset Browser selection (`selectedAssetId`, search, `currentFolder`) is UI-local. Do not confuse it with scene node selection.

---

## Drag assets into the scene

An asset can be dragged from Asset Browser to Scene View. The drag payload should pass an `assetId`. Do not transfer large asset data through drag metadata.

Examples:

```text
PNG/WebP          → Sprite component
GLB/GLTF          → Model3D component
.aseprite / .ase  → Sprite (one frame) or AnimatedSprite (tags / multiple frames)
.xml / .fnt + pages → BitmapText component
TTF/OTF/WOFF/WOFF2 → Text component (webfont)
```

Drop coordinates must be converted from viewport coordinates into scene/world coordinates. Creating an object through drag-and-drop MUST use the command system so it can be undone.

---

## Import pipeline

```text
Raw Asset
   ↓
Importer
   ↓
Asset Metadata
   ↓
Processor
   ↓
Runtime Asset
```

Each importer should be extensible:

```ts
interface AssetImporter {
  supports(file: ImportFile): boolean;
  import(file: ImportFile): Promise<AssetRecord>;
}
```

Possible importers: `TextureImporter`, `ModelImporter`, `AudioImporter`, `BitmapFontAssetImporter`, `WebFontAssetImporter`, `SpineImporter`, `AsepriteAssetImporter`.

Bitmap fonts are AngelCode BMFont bundles (`.xml` / `.fnt` plus page PNGs). The catalogue `path` is the descriptor; page textures are owned files, not separate records. Scenes store the font `assetId` on `BitmapText`. Editor content URLs have no file extension, so the Pixi renderer loads pages from allowlisted `/assets/:id/part/:name` URLs instead of resolving images relative to the XML.

Webfonts are single TTF/OTF/WOFF/WOFF2 files (`webfont` catalogue type, distinct from bitmap `font`). The CSS family is taken from the file stem with original casing (`ChaChicle.ttf` → `ChaChicle`, `Dotrice-Regular.woff` → `Dotrice Regular`). Scenes store the webfont `assetId` on `Text` / `HTMLText` as `style.fontAssetId`. Editor content URLs have no extension, so the Pixi renderer loads with parser `web-font` and an explicit `family` instead of sniffing the filename.

Shipping a game that uses the Spine runtime requires a Spine Editor license (Esoteric Software). The importer does not gate on that license.

Aseprite compile is an **editor/build-time** dependency. Detect `aseprite` or the free `libresprite` CLI behind `AsepriteService` (PATH, `ASEPRITE` env, well-known install folders). Do not call `child_process` from the Assets UI. Missing CLI must not crash the editor. Games ship only generated PNG/JSON; players do not need Aseprite. Details: [`aseprite.md`](./aseprite.md).

---

## Spritesheet / atlas pipeline

Aseprite / LibreSprite sources already compile incrementally to a packed PNG + Pixi spritesheet JSON (tags → `spritesheet.animations`). See [`aseprite.md`](./aseprite.md).

Users must still be able to build spritesheets from multiple loose source textures.

```ts
interface AtlasConfig {
  name: string;
  include: string[];
  exclude?: string[];
  maxWidth?: number;
  maxHeight?: number;
  padding?: number;
  trim?: boolean;
  rotate?: boolean;
  powerOfTwo?: boolean;
  format?: "png" | "webp";
  scale?: number;
}
```

Example:

```json
{
  "name": "symbols",
  "include": ["assets/symbols/*.png"],
  "maxWidth": 2048,
  "maxHeight": 2048,
  "padding": 2,
  "trim": true,
  "rotate": false,
  "format": "webp"
}
```

Atlas builder requirements: deterministic output where possible, incremental rebuild, file hashing, preview, multiple pages if the atlas exceeds maximum dimensions.

Example output: `symbols-0.webp` + `symbols-0.json`, `symbols-1.webp` + `symbols-1.json`.

Runtime code must not care which physical atlas contains a logical asset.

---

## Generated files

Generated assets must be clearly separated from source assets when practical.

```text
assets/                         # source (including .aseprite)
.generated/                     # derived PNG/JSON (mirrors source path)
.project/aseprite-cache.json    # compile skip cache (mtime + size)
```

Example: `assets/characters/hero.aseprite` → `.generated/assets/characters/hero.png` and `hero.json`.

Do not invent a second generated-folder convention. Do not manually edit generated files.

Derived PNG/JSON under `games/<name>/.generated` are committed so GitHub Actions can build the static demo and standalone games without the Aseprite CLI. Keep `.project/aseprite-cache.json` and `.generated` undo trash gitignored. After changing a source `.aseprite`, regenerate locally and commit the matching PNG/JSON. Game Vite copies `.generated` into the production `dist`; the editor demo plugin copies it under `/demo/<id>/.generated`.
