import {
  getFileBasename,
  getFileExtension,
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
} from "./texture-extensions.js";
import type { AssetRecord } from "./types.js";

export const BITMAP_FONT_XML_EXTENSION = ".xml";
export const BITMAP_FONT_FNT_EXTENSION = ".fnt";

const BITMAP_FONT_PART_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

export interface BitmapFontDescriptorMeta {
  fontFamily: string;
  pageNames: string[];
}

export function isBitmapFontDescriptorExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ext === BITMAP_FONT_XML_EXTENSION || ext === BITMAP_FONT_FNT_EXTENSION;
}

/** Browser drop filter: AngelCode BMFont XML or text .fnt. */
export function isBitmapFontImportFile(file: { name: string }): boolean {
  return isBitmapFontDescriptorExtension(file.name);
}

export function isAllowedBitmapFontPartName(part: string): boolean {
  return (
    BITMAP_FONT_PART_NAME_PATTERN.test(part) &&
    !part.includes("/") &&
    !part.includes("\\") &&
    !part.includes("..")
  );
}

/**
 * Reads `face` and page image names from AngelCode BMFont XML or text .fnt.
 * Returns undefined when the payload is not a bitmap font descriptor.
 */
export function parseBitmapFontDescriptor(
  text: string,
): BitmapFontDescriptorMeta | undefined {
  const xml = parseBitmapFontXmlDescriptor(text);
  if (xml) {
    return xml;
  }
  return parseBitmapFontTextDescriptor(text);
}

function parseBitmapFontXmlDescriptor(
  text: string,
): BitmapFontDescriptorMeta | undefined {
  if (!/<font[\s>]/i.test(text) || !/<page[\s>]/i.test(text)) {
    return undefined;
  }
  const info = /<info\b[^>]*>/i.exec(text)?.[0];
  const fontFamily = info ? readXmlAttribute(info, "face") : undefined;
  if (!fontFamily) {
    return undefined;
  }
  const pageNames: string[] = [];
  const pageTag = /<page\b[^>]*>/gi;
  for (const match of text.matchAll(pageTag)) {
    const tag = match[0];
    const file = readXmlAttribute(tag, "file");
    if (file && isSupportedTextureExtension(file)) {
      pageNames.push(file);
    }
  }
  if (pageNames.length === 0) {
    return undefined;
  }
  return { fontFamily, pageNames };
}

function parseBitmapFontTextDescriptor(
  text: string,
): BitmapFontDescriptorMeta | undefined {
  if (!/^info\s/m.test(text) || !/^page\s/m.test(text)) {
    return undefined;
  }
  const info = /^info\s+.+$/m.exec(text)?.[0];
  const fontFamily = info ? readFntAttribute(info, "face") : undefined;
  if (!fontFamily) {
    return undefined;
  }
  const pageNames: string[] = [];
  const pageLine = /^page\s+.+$/gm;
  for (const match of text.matchAll(pageLine)) {
    const line = match[0];
    const file = readFntAttribute(line, "file");
    if (file && isSupportedTextureExtension(file)) {
      pageNames.push(file);
    }
  }
  if (pageNames.length === 0) {
    return undefined;
  }
  return { fontFamily, pageNames };
}

function readXmlAttribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
  return match?.[1] && match[1].length > 0 ? match[1] : undefined;
}

function readFntAttribute(line: string, name: string): string | undefined {
  const quoted = new RegExp(`\\b${name}="([^"]*)"`).exec(line);
  if (quoted?.[1] && quoted[1].length > 0) {
    return quoted[1];
  }
  const bare = new RegExp(`\\b${name}=(\\S+)`).exec(line);
  return bare?.[1] && bare[1].length > 0 ? bare[1] : undefined;
}

export function resolveBitmapFontPartRelativePath(
  record: AssetRecord,
  part: string,
): string | undefined {
  if (record.metadata.kind !== "font" || !isAllowedBitmapFontPartName(part)) {
    return undefined;
  }
  const wanted = part.toLowerCase();
  return record.metadata.pagePaths.find(
    (assetPath) => getFileBasename(assetPath).toLowerCase() === wanted,
  );
}

export function mimeTypeForBitmapFontDescriptor(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext === BITMAP_FONT_XML_EXTENSION) {
    return "application/xml; charset=utf-8";
  }
  if (ext === BITMAP_FONT_FNT_EXTENSION) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

export function mimeTypeForBitmapFontPart(fileName: string): string {
  if (isBitmapFontDescriptorExtension(fileName)) {
    return mimeTypeForBitmapFontDescriptor(fileName);
  }
  if (isSupportedTextureExtension(fileName)) {
    return mimeTypeForTextureFileName(fileName);
  }
  return "application/octet-stream";
}
