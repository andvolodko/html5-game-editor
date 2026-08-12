/** Shared texture extension / MIME helpers used by editor and project-server. */

export const TEXTURE_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

export type TextureFileExtension = (typeof TEXTURE_FILE_EXTENSIONS)[number];

const TEXTURE_EXTENSION_SET = new Set<string>(TEXTURE_FILE_EXTENSIONS);

const MIME_BY_EXT: Record<TextureFileExtension, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function getFileBasename(fileName: string): string {
  const slash = Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\"));
  return slash >= 0 ? fileName.slice(slash + 1) : fileName;
}

export function getFileExtension(fileName: string): string {
  const base = getFileBasename(fileName);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    return "";
  }
  return base.slice(dot).toLowerCase();
}

export function getFileStem(fileName: string): string {
  const base = getFileBasename(fileName);
  const ext = getFileExtension(base);
  return ext.length > 0 ? base.slice(0, -ext.length) : base;
}

export function isSupportedTextureExtension(fileName: string): boolean {
  return TEXTURE_EXTENSION_SET.has(getFileExtension(fileName));
}

export function mimeTypeForTextureFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext in MIME_BY_EXT) {
    return MIME_BY_EXT[ext as TextureFileExtension];
  }
  return "application/octet-stream";
}

/** Browser File filter (name + MIME). */
export function isSupportedTextureFile(file: {
  name: string;
  type?: string;
}): boolean {
  if (isSupportedTextureExtension(file.name)) {
    return true;
  }
  const type = file.type ?? "";
  return (
    type === "image/png" || type === "image/jpeg" || type === "image/webp"
  );
}

/**
 * Map texture MIME → Pixi `format` / file extension without the leading dot.
 * Needed when content URLs have no path extension (e.g. `/assets/:id/content`).
 */
export function textureFormatFromMimeType(mimeType: string): string | undefined {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return undefined;
  }
}
