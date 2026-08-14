export interface ParsedBitmapFontChar {
  id: number;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
  kerning: Record<string, number>;
  letter: string;
}

export interface ParsedBitmapFont {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  baseLineOffset: number;
  pages: Array<{ id: number; file: string }>;
  chars: Record<string, ParsedBitmapFontChar>;
  distanceField?: {
    type: "sdf" | "msdf" | "none";
    range: number;
  };
}

function xmlAttr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
  return match?.[1];
}

function xmlInt(tag: string, name: string, fallback = 0): number {
  const raw = xmlAttr(tag, name);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function collectTags(source: string, tagName: string): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return [...source.matchAll(pattern)].map((match) => match[0]);
}

/**
 * Parses AngelCode BMFont XML into Pixi `BitmapFontData` without DOMParser
 * (works in Node tests and in the editor).
 */
export function parseBitmapFontXml(text: string): ParsedBitmapFont {
  const info = collectTags(text, "info")[0];
  const common = collectTags(text, "common")[0];
  if (!info || !common) {
    throw new Error("Bitmap font XML is missing <info> or <common>");
  }
  const fontFamily = xmlAttr(info, "face");
  if (!fontFamily) {
    throw new Error("Bitmap font XML is missing info face");
  }

  const pages = collectTags(text, "page").map((tag) => ({
    id: xmlInt(tag, "id"),
    file: xmlAttr(tag, "file") ?? "",
  }));
  if (pages.length === 0 || pages.some((page) => page.file.length === 0)) {
    throw new Error("Bitmap font XML has no page textures");
  }

  const fontSize = xmlInt(info, "size");
  const lineHeight = xmlInt(common, "lineHeight");
  const base = xmlInt(common, "base");
  const chars: Record<string, ParsedBitmapFontChar> = {};
  const idToLetter: Record<number, string> = {};

  for (const tag of collectTags(text, "char")) {
    const id = xmlInt(tag, "id");
    let letter = xmlAttr(tag, "letter") ?? xmlAttr(tag, "char") ?? String.fromCharCode(id);
    if (letter === "space") {
      letter = " ";
    }
    idToLetter[id] = letter;
    chars[letter] = {
      id,
      page: xmlInt(tag, "page"),
      x: xmlInt(tag, "x"),
      y: xmlInt(tag, "y"),
      width: xmlInt(tag, "width"),
      height: xmlInt(tag, "height"),
      xOffset: xmlInt(tag, "xoffset"),
      yOffset: xmlInt(tag, "yoffset"),
      xAdvance: xmlInt(tag, "xadvance"),
      kerning: {},
      letter,
    };
  }

  for (const tag of collectTags(text, "kerning")) {
    const first = xmlInt(tag, "first");
    const second = xmlInt(tag, "second");
    const amount = xmlInt(tag, "amount");
    const firstLetter = idToLetter[first];
    const secondLetter = idToLetter[second];
    const glyph = secondLetter !== undefined ? chars[secondLetter] : undefined;
    if (glyph && firstLetter !== undefined) {
      glyph.kerning[firstLetter] = amount;
    }
  }

  const distanceFieldTag = collectTags(text, "distanceField")[0];
  const data: ParsedBitmapFont = {
    chars,
    pages,
    lineHeight,
    fontSize,
    fontFamily,
    baseLineOffset: lineHeight - base,
  };
  if (distanceFieldTag) {
    const type = xmlAttr(distanceFieldTag, "fieldType");
    if (type === "sdf" || type === "msdf" || type === "none") {
      data.distanceField = {
        type,
        range: xmlInt(distanceFieldTag, "distanceRange"),
      };
    }
  }
  return data;
}
