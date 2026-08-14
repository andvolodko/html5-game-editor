import type {
  AsepriteAssetMetadata,
  AsepriteTagDirection,
  AsepriteTagMetadata,
} from "./types.js";
import { getFileBasename } from "./texture-extensions.js";

/** Aseprite's default frame duration when the CLI omits `duration`. */
export const ASEPRITE_DEFAULT_FRAME_DURATION_MS = 100;

export interface AsepriteCliFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AsepriteCliFrame {
  filename?: string;
  frame: AsepriteCliFrameRect;
  rotated?: boolean;
  trimmed?: boolean;
  spriteSourceSize?: AsepriteCliFrameRect;
  sourceSize?: { w: number; h: number };
  duration?: number;
}

export interface AsepriteCliTag {
  name: string;
  from: number;
  to: number;
  direction?: string;
}

export interface AsepriteCliJson {
  frames: AsepriteCliFrame[] | Record<string, AsepriteCliFrame>;
  meta?: {
    image?: string;
    size?: { w: number; h: number };
    frameTags?: AsepriteCliTag[];
  };
}

export interface PixiSpritesheetJson {
  frames: Record<string, PixiSpritesheetFrame>;
  animations: Record<string, string[]>;
  meta: {
    image: string;
    format: "RGBA8888";
    size: { w: number; h: number };
    scale: "1";
  };
}

export interface PixiSpritesheetFrame {
  frame: AsepriteCliFrameRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: AsepriteCliFrameRect;
  sourceSize: { w: number; h: number };
}

export function isAsepriteCliJson(value: unknown): value is AsepriteCliJson {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.frames !== undefined && typeof record.frames === "object";
}

export function parseAsepriteCliJsonBytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export function listAsepriteCliFrames(json: AsepriteCliJson): AsepriteCliFrame[] {
  if (Array.isArray(json.frames)) {
    return json.frames;
  }
  return Object.entries(json.frames).map(([filename, frame]) => ({
    ...frame,
    filename: frame.filename ?? filename,
  }));
}

export function normalizeAsepriteTagDirection(
  raw: string | undefined,
): AsepriteTagDirection {
  if (raw === undefined) {
    return "forward";
  }
  const normalized = raw.toLowerCase().replace(/-/g, "");
  if (normalized === "reverse" || normalized === "backward") {
    return "reverse";
  }
  if (normalized.startsWith("pingpong")) {
    return "pingpong";
  }
  return "forward";
}

/**
 * Stable Pixi cache key prefix so two sheets do not both register `frame-0`.
 * `assets/characters/hero.aseprite` → `assets-characters-hero`.
 */
export function asepriteFrameNamespace(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutGenerated = normalized.replace(/^\.generated\//, "");
  const withoutExt = withoutGenerated.replace(/\.(aseprite|ase|png|json)$/i, "");
  const slug = withoutExt.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "sheet";
}

export function asepriteFrameName(index: number, namespace = ""): string {
  if (namespace.length === 0) {
    return `frame-${String(index)}`;
  }
  return `${namespace}-frame-${String(index)}`;
}

function expandTagFrameIndexes(tag: AsepriteTagMetadata): number[] {
  const from = tag.from;
  const to = tag.to;
  if (to < from) {
    return [];
  }
  const forward: number[] = [];
  for (let index = from; index <= to; index += 1) {
    forward.push(index);
  }
  if (tag.direction === "reverse") {
    return [...forward].reverse();
  }
  if (tag.direction === "pingpong" && forward.length > 1) {
    const back = [...forward].reverse().slice(1, -1);
    return [...forward, ...back];
  }
  return forward;
}

function asepriteCelDisplaySize(json: AsepriteCliJson): {
  width: number;
  height: number;
} {
  const first = listAsepriteCliFrames(json)[0];
  const source = first?.sourceSize;
  if (source && source.w > 0 && source.h > 0) {
    return { width: source.w, height: source.h };
  }
  const rect = first?.frame;
  return {
    width: rect && rect.w > 0 ? rect.w : 1,
    height: rect && rect.h > 0 ? rect.h : 1,
  };
}

export function normalizeAsepriteMetadata(
  json: AsepriteCliJson,
  paths: { sheetPath: string; dataPath: string },
  compileRevision?: string,
): AsepriteAssetMetadata {
  const frames = listAsepriteCliFrames(json);
  const { width, height } = asepriteCelDisplaySize(json);
  const rawTags = json.meta?.frameTags ?? [];
  const tags: AsepriteTagMetadata[] = [];
  const seenTagNames = new Set<string>();
  for (const tag of rawTags) {
    if (typeof tag.name !== "string" || tag.name.length === 0) {
      continue;
    }
    if (!Number.isInteger(tag.from) || !Number.isInteger(tag.to)) {
      continue;
    }
    if (seenTagNames.has(tag.name)) {
      continue;
    }
    seenTagNames.add(tag.name);
    tags.push({
      name: tag.name,
      from: tag.from,
      to: tag.to,
      direction: normalizeAsepriteTagDirection(tag.direction),
    });
  }
  const frameDurations = frames.map((frame) =>
    typeof frame.duration === "number" && frame.duration > 0
      ? frame.duration
      : ASEPRITE_DEFAULT_FRAME_DURATION_MS,
  );
  const metadata: AsepriteAssetMetadata = {
    kind: "aseprite",
    width,
    height,
    frameCount: frames.length,
    tags,
    frameDurations,
    sheetPath: paths.sheetPath,
    dataPath: paths.dataPath,
  };
  if (compileRevision !== undefined) {
    metadata.compileRevision = compileRevision;
  }
  return metadata;
}

export function asepriteCliJsonToPixiSpritesheet(
  json: AsepriteCliJson,
  imageFileName: string,
  frameNamespace = asepriteFrameNamespace(imageFileName),
): PixiSpritesheetJson {
  const frames = listAsepriteCliFrames(json);
  const frameName = (index: number): string =>
    asepriteFrameName(index, frameNamespace);
  const pixiFrames: Record<string, PixiSpritesheetFrame> = {};
  frames.forEach((frame, index) => {
    const rect = frame.frame;
    const sourceSize = frame.sourceSize ?? { w: rect.w, h: rect.h };
    const spriteSourceSize = frame.spriteSourceSize ?? {
      x: 0,
      y: 0,
      w: rect.w,
      h: rect.h,
    };
    pixiFrames[frameName(index)] = {
      frame: rect,
      rotated: frame.rotated === true,
      trimmed: frame.trimmed === true,
      spriteSourceSize,
      sourceSize,
    };
  });

  const metadata = normalizeAsepriteMetadata(json, {
    sheetPath: imageFileName,
    dataPath: imageFileName,
  });
  const animations: Record<string, string[]> = {};
  for (const tag of metadata.tags) {
    animations[tag.name] = expandTagFrameIndexes(tag).map(frameName);
  }
  if (Object.keys(animations).length === 0 && frames.length > 0) {
    animations.default = frames.map((_, index) => frameName(index));
  }

  const size = json.meta?.size ?? {
    w: frames[0]?.frame.w ?? 1,
    h: frames[0]?.frame.h ?? 1,
  };

  return {
    frames: pixiFrames,
    animations,
    meta: {
      image: getFileBasename(imageFileName),
      format: "RGBA8888",
      size,
      scale: "1",
    },
  };
}
