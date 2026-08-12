import path from "node:path";
import {
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
} from "@game-editor/assets";

export { isSupportedTextureExtension };

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
