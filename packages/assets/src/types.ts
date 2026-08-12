export const ASSET_SCHEMA_VERSION = 1 as const;

export type AssetType =
  | "texture"
  | "spritesheet"
  | "model3d"
  | "audio"
  | "font"
  | "spine"
  | "environment"
  | "scene"
  | "prefab";

/**
 * Stable asset identity. Scenes must reference `id`, never raw filesystem paths.
 */
export interface AssetRecord {
  id: string;
  type: AssetType;
  /** Project-relative path managed by AssetDatabase / project-server. */
  path: string;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface AssetDatabaseData {
  version: number;
  assets: AssetRecord[];
}
