import { getFileBasename, getFileExtension, getFileStem } from "./texture-extensions.js";
import type { AsepriteAssetMetadata, AssetRecord } from "./types.js";

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "");
}

export const ASEPRITE_FILE_EXTENSIONS = [".aseprite", ".ase"] as const;
export type AsepriteFileExtension = (typeof ASEPRITE_FILE_EXTENSIONS)[number];

const ASEPRITE_EXTENSION_SET = new Set<string>(ASEPRITE_FILE_EXTENSIONS);

/** Project-relative root for derived spritesheets (not listed in the Assets tree). */
export const GENERATED_ASSETS_ROOT = ".generated";

/**
 * Dist / HTTP folder for those sheets. Android WebView and aapt skip hidden
 * paths, so production must not request `/.generated/`.
 */
export const PUBLIC_GENERATED_ASSETS_ROOT = "_generated";

const ASEPRITE_PART_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

export function isSupportedAsepriteExtension(fileName: string): boolean {
  return ASEPRITE_EXTENSION_SET.has(getFileExtension(fileName));
}

export function isSupportedAsepriteFile(file: { name: string }): boolean {
  return isSupportedAsepriteExtension(file.name);
}

/**
 * Derived PNG/JSON paths that mirror the source under `.generated/`.
 * `assets/characters/hero.aseprite` → `.generated/assets/characters/hero.png|json`.
 */
export function generatedAsepriteOutputPaths(sourcePath: string): {
  sheetPath: string;
  dataPath: string;
} {
  const normalized = normalizePath(sourcePath);
  const slash = normalized.lastIndexOf("/");
  const dir = slash >= 0 ? normalized.slice(0, slash) : "";
  const stem = getFileStem(normalized);
  const generatedDir = dir.length > 0
    ? `${GENERATED_ASSETS_ROOT}/${dir}`
    : GENERATED_ASSETS_ROOT;
  return {
    sheetPath: `${generatedDir}/${stem}.png`,
    dataPath: `${generatedDir}/${stem}.json`,
  };
}

/**
 * Catalogue paths stay under `.generated/`. Fetchable URLs / dist use `_generated/`.
 */
export function toPublicAssetPath(projectPath: string): string {
  const normalized = normalizePath(projectPath);
  if (normalized === GENERATED_ASSETS_ROOT) {
    return PUBLIC_GENERATED_ASSETS_ROOT;
  }
  const prefix = `${GENERATED_ASSETS_ROOT}/`;
  if (normalized.startsWith(prefix)) {
    return `${PUBLIC_GENERATED_ASSETS_ROOT}/${normalized.slice(prefix.length)}`;
  }
  return normalized;
}

export function derivedAsepritePaths(record: AssetRecord): string[] {
  if (record.metadata.kind !== "aseprite") {
    return [];
  }
  return [record.metadata.sheetPath, record.metadata.dataPath];
}

export function withAsepriteSourcePath(
  record: AssetRecord,
  nextPath: string,
): AssetRecord {
  if (record.metadata.kind !== "aseprite") {
    return { ...record, path: normalizePath(nextPath) };
  }
  const generated = generatedAsepriteOutputPaths(nextPath);
  return {
    ...record,
    path: normalizePath(nextPath),
    metadata: {
      ...record.metadata,
      sheetPath: generated.sheetPath,
      dataPath: generated.dataPath,
    },
  };
}

export function isAsepriteAnimated(metadata: AsepriteAssetMetadata): boolean {
  return metadata.frameCount > 1 || metadata.tags.length > 0;
}

export function firstAsepriteAnimation(
  metadata: AsepriteAssetMetadata,
): string | undefined {
  return metadata.tags[0]?.name;
}

export function isAllowedAsepritePartName(part: string): boolean {
  return (
    ASEPRITE_PART_NAME_PATTERN.test(part) &&
    !part.includes("/") &&
    !part.includes("\\") &&
    !part.includes("..")
  );
}

export function resolveAsepritePartRelativePath(
  record: AssetRecord,
  part: string,
): string | undefined {
  if (record.metadata.kind !== "aseprite" || !isAllowedAsepritePartName(part)) {
    return undefined;
  }
  const wanted = part.toLowerCase();
  const candidates = [record.metadata.sheetPath, record.metadata.dataPath];
  return candidates.find(
    (assetPath) => getFileBasename(assetPath).toLowerCase() === wanted,
  );
}

export function mimeTypeForAsepritePart(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext === ".json") {
    return "application/json";
  }
  if (ext === ".png") {
    return "image/png";
  }
  return "application/octet-stream";
}

export function asepriteCompileRevision(
  sourceMtimeMs: number,
  sourceSize: number,
): string {
  return `${String(sourceMtimeMs)}-${String(sourceSize)}`;
}
