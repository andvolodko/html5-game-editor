import { createId } from "@game-editor/shared";
import {
  ASSET_SCHEMA_VERSION,
  type AssetDatabaseData,
  type AssetRecord,
  type AudioAssetMetadata,
  type AsepriteAssetMetadata,
  type AsepriteTagMetadata,
  type GltfAssetMetadata,
  type BitmapFontAssetMetadata,
  type SpineAssetMetadata,
  type TextureAssetMetadata,
  type WebFontAssetMetadata,
} from "./types.js";
import { generatedAsepriteOutputPaths } from "./aseprite-extensions.js";

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

export function createAudioAssetRecord(input: {
  name: string;
  path: string;
  mimeType: string;
  id?: string;
}): AssetRecord {
  const metadata: AudioAssetMetadata = {
    kind: "audio",
    mimeType: input.mimeType,
  };

  return {
    id: input.id ?? createId("asset"),
    type: "audio",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

export function createGltfAssetRecord(input: {
  name: string;
  path: string;
  mimeType: string;
  format: "glb" | "gltf";
  animations?: string[];
  bufferPaths?: string[];
  imagePaths?: string[];
  id?: string;
}): AssetRecord {
  const metadata: GltfAssetMetadata = {
    kind: "gltf",
    mimeType: input.mimeType,
    format: input.format,
    animations: input.animations ? [...input.animations] : [],
    ...(input.bufferPaths !== undefined
      ? { bufferPaths: input.bufferPaths.map(normalizeProjectRelativePath) }
      : {}),
    ...(input.imagePaths !== undefined
      ? { imagePaths: input.imagePaths.map(normalizeProjectRelativePath) }
      : {}),
  };

  return {
    id: input.id ?? createId("asset"),
    type: "gltf",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

export function createBitmapFontAssetRecord(input: {
  name: string;
  path: string;
  fontFamily: string;
  pagePaths: string[];
  id?: string;
}): AssetRecord {
  const metadata: BitmapFontAssetMetadata = {
    kind: "font",
    fontFamily: input.fontFamily,
    pagePaths: input.pagePaths.map(normalizeProjectRelativePath),
  };

  return {
    id: input.id ?? createId("asset"),
    type: "font",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

export function createWebFontAssetRecord(input: {
  name: string;
  path: string;
  fontFamily: string;
  mimeType: string;
  format: WebFontAssetMetadata["format"];
  id?: string;
}): AssetRecord {
  const metadata: WebFontAssetMetadata = {
    kind: "webfont",
    fontFamily: input.fontFamily,
    mimeType: input.mimeType,
    format: input.format,
  };

  return {
    id: input.id ?? createId("asset"),
    type: "webfont",
    name: input.name,
    path: normalizeProjectRelativePath(input.path),
    metadata,
  };
}

export function createAsepriteAssetRecord(input: {
  name: string;
  path: string;
  width?: number;
  height?: number;
  frameCount?: number;
  tags?: AsepriteTagMetadata[];
  frameDurations?: number[];
  sheetPath?: string;
  dataPath?: string;
  compileRevision?: string;
  compileError?: string;
  id?: string;
}): AssetRecord {
  const generated = generatedAsepriteOutputPaths(input.path);
  const metadata: AsepriteAssetMetadata = {
    kind: "aseprite",
    width: input.width ?? 1,
    height: input.height ?? 1,
    frameCount: input.frameCount ?? 0,
    tags: input.tags ? [...input.tags] : [],
    frameDurations: input.frameDurations ? [...input.frameDurations] : [],
    sheetPath: normalizeProjectRelativePath(input.sheetPath ?? generated.sheetPath),
    dataPath: normalizeProjectRelativePath(input.dataPath ?? generated.dataPath),
  };
  if (input.compileRevision !== undefined) {
    metadata.compileRevision = input.compileRevision;
  }
  if (input.compileError !== undefined) {
    metadata.compileError = input.compileError;
  }

  return {
    id: input.id ?? createId("asset"),
    type: "aseprite",
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
