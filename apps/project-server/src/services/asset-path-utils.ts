import path from "node:path";
import {
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
} from "@game-editor/assets";

export { isSupportedTextureExtension };

export const ASSET_FOLDER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

const FALLBACK_FILE_NAME = "upload.bin";
const FALLBACK_FOLDER_NAME = "folder";

export function mimeTypeForFileName(fileName: string): string {
  return mimeTypeForTextureFileName(fileName);
}

/**
 * Duplicate import strategy: never overwrite.
 * wild.png → wild.png | wild-1.png | wild-2.png ...
 */
export function allocateUniqueFileName(
  desiredFileName: string,
  existingNames: ReadonlySet<string>,
): string {
  const ext = path.extname(desiredFileName);
  const stem = path.basename(desiredFileName, ext);
  let candidate = desiredFileName;
  let index = 1;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${stem}-${String(index)}${ext}`;
    index += 1;
  }
  return candidate;
}

/**
 * Sanitize destination to a project-relative folder under assets/.
 * Path segments `.` / `..` are stripped (e.g. `../secret` → `assets/secret`).
 */
export function normalizeAssetDestination(destination?: string): string {
  const raw = (destination ?? "assets").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = raw.split("/").filter((part) => part.length > 0 && part !== "." && part !== "..");
  if (parts.length === 0) {
    return "assets";
  }
  if (parts[0] !== "assets") {
    return path.posix.join("assets", ...parts);
  }
  return parts.join("/");
}

export function isValidAssetFolderSegment(segment: string): boolean {
  return ASSET_FOLDER_NAME_PATTERN.test(segment);
}

export function sanitizeAssetFolderSegment(segment: string): string {
  const trimmed = segment.trim();
  if (isValidAssetFolderSegment(trimmed)) {
    return trimmed;
  }
  const replaced = trimmed
    .replace(/[^A-Za-z0-9._ -]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .trim();
  if (isValidAssetFolderSegment(replaced)) {
    return replaced;
  }
  const letters = replaced.replace(/[^A-Za-z0-9]+/g, "");
  return letters.length > 0 ? letters : FALLBACK_FOLDER_NAME;
}

/** Strip `.` / `..` / empty segments; normalize slashes. */
export function normalizeImportRelativePath(relativePath: string): string {
  const raw = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return raw
    .split("/")
    .filter((part) => part.length > 0 && part !== "." && part !== "..")
    .join("/");
}

export function sanitizeImportFileRelativePath(relativeFile: string): string {
  const parts = normalizeImportRelativePath(relativeFile).split("/").filter(Boolean);
  if (parts.length === 0) {
    return FALLBACK_FILE_NAME;
  }
  const base = parts[parts.length - 1] ?? FALLBACK_FILE_NAME;
  const folders = parts.slice(0, -1).map(sanitizeAssetFolderSegment);
  return [...folders, base].join("/");
}

export function sanitizeImportFolderPath(relativeFolder: string): string {
  const parts = normalizeImportRelativePath(relativeFolder)
    .split("/")
    .filter(Boolean)
    .map(sanitizeAssetFolderSegment);
  return parts.length > 0 ? parts.join("/") : FALLBACK_FOLDER_NAME;
}
