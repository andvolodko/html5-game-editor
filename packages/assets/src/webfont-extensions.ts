/** Shared webfont (TTF/OTF/WOFF) helpers used by editor and project-server. */

import { getFileExtension, getFileStem } from "./texture-extensions.js";

export const WEBFONT_FILE_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"] as const;

export type WebFontFileExtension = (typeof WEBFONT_FILE_EXTENSIONS)[number];

export type WebFontFormat = "ttf" | "otf" | "woff" | "woff2";

const WEBFONT_EXTENSION_SET = new Set<string>(WEBFONT_FILE_EXTENSIONS);

const MIME_BY_EXT: Record<WebFontFileExtension, string> = {
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const FORMAT_BY_EXT: Record<WebFontFileExtension, WebFontFormat> = {
  ".ttf": "ttf",
  ".otf": "otf",
  ".woff": "woff",
  ".woff2": "woff2",
};

export function isSupportedWebFontExtension(fileName: string): boolean {
  return WEBFONT_EXTENSION_SET.has(getFileExtension(fileName));
}

export function webFontFormatFromFileName(
  fileName: string,
): WebFontFormat | undefined {
  const ext = getFileExtension(fileName);
  if (ext in FORMAT_BY_EXT) {
    return FORMAT_BY_EXT[ext as WebFontFileExtension];
  }
  return undefined;
}

export function mimeTypeForWebFontFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext in MIME_BY_EXT) {
    return MIME_BY_EXT[ext as WebFontFileExtension];
  }
  return "application/octet-stream";
}

/**
 * CSS family from a webfont file stem. Hyphens/underscores become spaces;
 * original letter casing is kept (`Dotrice-Regular.woff` → `Dotrice Regular`,
 * `ChaChicle.ttf` → `ChaChicle`).
 */
export function fontFamilyFromWebFontFileName(fileName: string): string {
  const family = getFileStem(fileName)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return family.length > 0 ? family : "Font";
}

/** Browser File filter (name + MIME). */
export function isSupportedWebFontFile(file: {
  name: string;
  type?: string;
}): boolean {
  if (isSupportedWebFontExtension(file.name)) {
    return true;
  }
  const type = file.type ?? "";
  return (
    type === "font/ttf" ||
    type === "font/otf" ||
    type === "font/woff" ||
    type === "font/woff2" ||
    type === "application/font-sfnt" ||
    type === "application/font-woff" ||
    type === "application/font-woff2"
  );
}
