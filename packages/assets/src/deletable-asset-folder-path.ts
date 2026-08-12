import { ValidationError } from "@game-editor/core";

const ASSETS_ROOT = "assets";
const SCENES_FOLDER = "assets/scenes";
/** Same allowlist as project-server folder segments. */
const FOLDER_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

/**
 * Strict project-relative folder path for destructive delete.
 * Rejects traversal, rewriting, assets root, and reserved scenes paths.
 * Does **not** silently map `../x` → `assets/x` (unlike import destinations).
 */
export function parseDeletableAssetFolderPath(input: unknown): string {
  if (typeof input !== "string") {
    throw new ValidationError("Folder path must be a string");
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Folder path is required");
  }
  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    throw new ValidationError("Folder path must use forward slashes only");
  }
  if (trimmed.startsWith("/") || /^[A-Za-z]:/.test(trimmed)) {
    throw new ValidationError("Folder path must be project-relative");
  }
  if (trimmed.includes("..")) {
    throw new ValidationError("Folder path must not contain '..'");
  }

  const parts = trimmed.split("/").filter((part) => part.length > 0);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new ValidationError("Folder path contains invalid segments");
  }
  if (parts.length < 2 || parts[0] !== ASSETS_ROOT) {
    throw new ValidationError(
      "Folder path must be under assets/ (not the assets root itself)",
    );
  }

  for (const segment of parts.slice(1)) {
    if (!FOLDER_SEGMENT_PATTERN.test(segment)) {
      throw new ValidationError(`Invalid folder name: ${segment}`);
    }
  }

  const folder = parts.join("/");
  if (folder === ASSETS_ROOT) {
    throw new ValidationError("Cannot remove the assets root folder");
  }
  if (
    folder === SCENES_FOLDER ||
    folder.startsWith(`${SCENES_FOLDER}/`) ||
    parts[1]?.toLowerCase() === "scenes"
  ) {
    throw new ValidationError("Cannot remove the reserved scenes folder");
  }

  return folder;
}
