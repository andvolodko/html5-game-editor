import {
  getFileBasename,
  getFileExtension,
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
} from "./texture-extensions.js";
import type { AssetRecord } from "./types.js";

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "");
}

export const SPINE_ATLAS_EXTENSION = ".atlas";
export const SPINE_JSON_EXTENSION = ".json";
export const SPINE_SKEL_EXTENSION = ".skel";

const SPINE_PART_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

export interface SpineSkeletonMeta {
  skins: string[];
  animations: string[];
}

export function isSpineAtlasFile(fileName: string): boolean {
  return getFileExtension(fileName) === SPINE_ATLAS_EXTENSION;
}

export function isSpineSkeletonExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ext === SPINE_JSON_EXTENSION || ext === SPINE_SKEL_EXTENSION;
}

/** Browser drop filter: skeleton, atlas, or (with textures) a complete set. */
export function isSpineImportFile(file: { name: string }): boolean {
  return isSpineAtlasFile(file.name) || isSpineSkeletonExtension(file.name);
}

export function isSpineSkeletonJson(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const hasBones = Array.isArray(record.bones);
  const hasSkeleton =
    record.skeleton !== undefined && typeof record.skeleton === "object";
  const hasSkins = record.skins !== undefined;
  const hasAnimations = record.animations !== undefined;
  return (hasBones || hasSkeleton) && (hasSkins || hasAnimations);
}

export function parseSpineSkeletonJsonBytes(bytes: Uint8Array): unknown | undefined {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

export function parseSpineSkeletonMeta(json: unknown): SpineSkeletonMeta {
  if (json === null || typeof json !== "object") {
    return { skins: [], animations: [] };
  }
  const record = json as Record<string, unknown>;
  const skins: string[] = [];
  if (Array.isArray(record.skins)) {
    for (const skin of record.skins) {
      if (
        skin !== null &&
        typeof skin === "object" &&
        "name" in skin &&
        typeof (skin as { name: unknown }).name === "string"
      ) {
        skins.push((skin as { name: string }).name);
      }
    }
  } else if (record.skins !== null && typeof record.skins === "object") {
    skins.push(...Object.keys(record.skins));
  }

  const animations: string[] = [];
  if (record.animations !== null && typeof record.animations === "object") {
    animations.push(...Object.keys(record.animations));
  }

  return { skins, animations };
}

/**
 * Atlas page image names (first non-indented filename before `size:` / `format:`).
 */
export function parseAtlasPageNames(atlasText: string): string[] {
  const pages: string[] = [];
  const lines = atlasText.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.length === 0 || line.startsWith(" ") || line.startsWith("\t")) {
      continue;
    }
    if (trimmed.includes(":")) {
      continue;
    }
    const next = lines[index + 1]?.trim() ?? "";
    if (
      next.startsWith("size:") ||
      next.startsWith("format:") ||
      next.startsWith("filter:")
    ) {
      pages.push(trimmed);
    }
  }
  return pages;
}

export function isAllowedSpinePartName(part: string): boolean {
  return (
    SPINE_PART_NAME_PATTERN.test(part) &&
    !part.includes("/") &&
    !part.includes("\\") &&
    !part.includes("..")
  );
}

export function ownedAssetPaths(record: AssetRecord): string[] {
  if (record.metadata.kind === "spine") {
    return [
      record.path,
      record.metadata.atlasPath,
      ...record.metadata.pagePaths,
    ];
  }
  return [record.path];
}

export function relocateOwnedAssetPaths(
  record: AssetRecord,
  fromPrefix: string,
  toPrefix: string,
): AssetRecord {
  const relocate = (assetPath: string): string => {
    const normalized = normalizePath(assetPath);
    if (normalized === fromPrefix || normalized.startsWith(`${fromPrefix}/`)) {
      return `${toPrefix}${normalized.slice(fromPrefix.length)}`;
    }
    return normalized;
  };

  if (record.metadata.kind === "spine") {
    return {
      ...record,
      path: relocate(record.path),
      metadata: {
        ...record.metadata,
        atlasPath: relocate(record.metadata.atlasPath),
        pagePaths: record.metadata.pagePaths.map(relocate),
      },
    };
  }

  return { ...record, path: relocate(record.path) };
}

/** Shared parent folder of all owned files, or undefined when files are not a bundle dir. */
export function spineBundleFolder(record: AssetRecord): string | undefined {
  if (record.metadata.kind !== "spine") {
    return undefined;
  }
  const dirs = ownedAssetPaths(record).map((assetPath) => {
    const normalized = normalizePath(assetPath);
    const slash = normalized.lastIndexOf("/");
    return slash > 0 ? normalized.slice(0, slash) : "";
  });
  const first = dirs[0];
  if (!first || first === "assets") {
    return undefined;
  }
  if (!dirs.every((dir) => dir === first)) {
    return undefined;
  }
  return first;
}

export function resolveSpinePartRelativePath(
  record: AssetRecord,
  part: string,
): string | undefined {
  if (record.metadata.kind !== "spine" || !isAllowedSpinePartName(part)) {
    return undefined;
  }
  const wanted = part.toLowerCase();
  const candidates = [record.metadata.atlasPath, ...record.metadata.pagePaths];
  return candidates.find(
    (assetPath) => getFileBasename(assetPath).toLowerCase() === wanted,
  );
}

export function mimeTypeForSpinePart(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext === SPINE_ATLAS_EXTENSION) {
    return "text/plain; charset=utf-8";
  }
  if (ext === SPINE_JSON_EXTENSION) {
    return "application/json";
  }
  if (ext === SPINE_SKEL_EXTENSION) {
    return "application/octet-stream";
  }
  if (isSupportedTextureExtension(fileName)) {
    return mimeTypeForTextureFileName(fileName);
  }
  return "application/octet-stream";
}

export function mimeTypeForSpineSkeleton(format: "json" | "skel"): string {
  return format === "json" ? "application/json" : "application/octet-stream";
}
