export const ASSET_SCHEMA_VERSION = 1 as const;

/**
 * Persisted asset kinds. Only kinds with importers/metadata are included.
 * Extend this union when a new importer ships — do not stub empty kinds.
 */
export type AssetType = "texture" | "spine" | "audio" | "gltf";

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

export type AssetMetadata =
  | TextureAssetMetadata
  | SpineAssetMetadata
  | AudioAssetMetadata
  | GltfAssetMetadata;

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
