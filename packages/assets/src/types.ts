export const ASSET_SCHEMA_VERSION = 1 as const;

/**
 * Persisted asset kinds. Only kinds with importers/metadata are included.
 * Extend this union when a new importer ships — do not stub empty kinds.
 */
export type AssetType = "texture" | "spine" | "audio" | "gltf" | "aseprite";

export interface TextureAssetMetadata {
  kind: "texture";
  width: number;
  height: number;
  mimeType: string;
}

export interface SpineAssetMetadata {
  kind: "spine";
  skeletonFormat: "json" | "skel";
  /** Project-relative path of the atlas file owned by this asset. */
  atlasPath: string;
  /** Project-relative paths of atlas page textures (not separate AssetRecords). */
  pagePaths: string[];
  /** Cached at import for Inspector dropdowns. */
  skins: string[];
  animations: string[];
}

export interface AudioAssetMetadata {
  kind: "audio";
  mimeType: string;
}

export interface GltfAssetMetadata {
  kind: "gltf";
  mimeType: string;
  /** Container format on disk (GLB single-file vs JSON glTF). */
  format: "glb" | "gltf";
  /** Cached at import for Inspector animation dropdown. */
  animations: string[];
  /** Project-relative buffer files owned by a multi-file .gltf asset. */
  bufferPaths?: string[];
  /** Project-relative image files owned by a multi-file .gltf asset. */
  imagePaths?: string[];
}

export type AsepriteTagDirection = "forward" | "reverse" | "pingpong";

export interface AsepriteTagMetadata {
  name: string;
  from: number;
  to: number;
  direction?: AsepriteTagDirection;
}

export interface AsepriteAssetMetadata {
  kind: "aseprite";
  /** Cel / canvas size of the first frame (not the packed atlas). */
  width: number;
  height: number;
  frameCount: number;
  tags: AsepriteTagMetadata[];
  frameDurations: number[];
  /** Project-relative packed spritesheet PNG (generated). */
  sheetPath: string;
  /** Project-relative Pixi spritesheet JSON (generated). */
  dataPath: string;
  /**
   * Changes when the source file is recompiled (mtime-size stamp).
   * Used to cache-bust editor part URLs; not a filesystem path.
   */
  compileRevision?: string;
  /** Set when Aseprite CLI is missing or export failed; omitted on success. */
  compileError?: string;
}

export type AssetMetadata =
  | TextureAssetMetadata
  | SpineAssetMetadata
  | AudioAssetMetadata
  | GltfAssetMetadata
  | AsepriteAssetMetadata;

/**
 * Stable asset identity. Scenes must reference `id`, never raw filesystem paths.
 * Invariant: `type === metadata.kind`.
 */
export interface AssetRecord {
  id: string;
  type: AssetType;
  /** Display name (usually file stem). */
  name: string;
  /** Project-relative POSIX-style path (forward slashes). */
  path: string;
  metadata: AssetMetadata;
}

export interface AssetDatabaseData {
  version: number;
  assets: AssetRecord[];
}
