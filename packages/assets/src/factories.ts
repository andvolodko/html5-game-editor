import { createId } from "@game-editor/shared";
import {
  ASSET_SCHEMA_VERSION,
  type AssetDatabaseData,
  type AssetRecord,
  type SpineAssetMetadata,
  type TextureAssetMetadata,
} from "./types.js";

export function createEmptyAssetDatabase(): AssetDatabaseData {
  return {
    version: ASSET_SCHEMA_VERSION,
    assets: [],
  };
}

export function createTextureAssetRecord(input: {
  name: string;
  path: string;
  width: number;
  height: number;
  mimeType: string;
  id?: string;
}): AssetRecord {
  const metadata: TextureAssetMetadata = {
    kind: "texture",
    width: input.width,
    height: input.height,
    mimeType: input.mimeType,
  };

  return {
    id: input.id ?? createId("asset"),
    type: "texture",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

export function createSpineAssetRecord(input: {
  name: string;
  path: string;
  skeletonFormat: "json" | "skel";
  atlasPath: string;
  pagePaths: string[];
  skins?: string[];
  animations?: string[];
  id?: string;
}): AssetRecord {
  const metadata: SpineAssetMetadata = {
    kind: "spine",
    skeletonFormat: input.skeletonFormat,
    atlasPath: normalizeProjectRelativePath(input.atlasPath),
    pagePaths: input.pagePaths.map(normalizeProjectRelativePath),
    skins: input.skins ? [...input.skins] : [],
    animations: input.animations ? [...input.animations] : [],
  };

  return {
    id: input.id ?? createId("asset"),
    type: "spine",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

/** Normalize to forward-slash project-relative paths without leading slash. */
export function normalizeProjectRelativePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function humanizeAssetNodeName(assetName: string): string {
  const stem = assetName.replace(/\.[^.]+$/, "");
  if (stem.length === 0) {
    return "Sprite";
  }
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}
