/** Strict CSS hex used in project.json (`#RRGGBB` or `#RRGGBBAA`). */
export const PROJECT_BACKGROUND_HEX_PATTERN =
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

const HEX_RADIX = 16;
const HEX_HASH_LENGTH = 1;
const RGB_HEX_DIGIT_COUNT = 6;
const RGBA_HEX_DIGIT_COUNT = 8;
const RGB_HEX_LENGTH = HEX_HASH_LENGTH + RGB_HEX_DIGIT_COUNT;
const RGBA_HEX_LENGTH = HEX_HASH_LENGTH + RGBA_HEX_DIGIT_COUNT;
const ALPHA_BYTE_MAX = 255;
const OPAQUE_ALPHA_HEX = "ff";

/** Opaque clear alpha (0–1). Omitted `#RRGGBB` backgrounds use this. */
export const OPAQUE_PROJECT_BACKGROUND_ALPHA = 1;

/** Inclusive alpha range authored in Project Settings. */
export const PROJECT_BACKGROUND_ALPHA_MIN = 0;
export const PROJECT_BACKGROUND_ALPHA_MAX = 1;

export interface ProjectBackgroundClear {
  color: number;
  alpha: number;
}

/** Normalize to lowercase `#rrggbb` or `#rrggbbaa`, or `undefined` if invalid. */
export function normalizeProjectBackgroundHex(
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!PROJECT_BACKGROUND_HEX_PATTERN.test(trimmed)) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.length === RGBA_HEX_LENGTH &&
    lower.slice(RGB_HEX_LENGTH) === OPAQUE_ALPHA_HEX
  ) {
    return lower.slice(0, RGB_HEX_LENGTH);
  }
  return lower;
}

/** `#rrggbb` for `<input type="color">`, or `undefined` if invalid. */
export function projectBackgroundRgbHex(hex: string): string | undefined {
  const normalized = normalizeProjectBackgroundHex(hex);
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, RGB_HEX_LENGTH);
}

/**
 * Build a persisted background hex. Opaque alpha serializes as `#rrggbb`.
 */
export function composeProjectBackgroundHex(
  rgbHex: string,
  alpha: number,
): string | undefined {
  const rgb = projectBackgroundRgbHex(rgbHex);
  if (!rgb || !Number.isFinite(alpha)) {
    return undefined;
  }
  const clamped = Math.min(
    PROJECT_BACKGROUND_ALPHA_MAX,
    Math.max(PROJECT_BACKGROUND_ALPHA_MIN, alpha),
  );
  const byte = Math.round(clamped * ALPHA_BYTE_MAX);
  if (byte === ALPHA_BYTE_MAX) {
    return rgb;
  }
  return `${rgb}${byte.toString(HEX_RADIX).padStart(2, "0")}`;
}

function rgbIntFromNormalized(normalized: string): number {
  return Number.parseInt(
    normalized.slice(HEX_HASH_LENGTH, RGB_HEX_LENGTH),
    HEX_RADIX,
  );
}

function alphaFromNormalized(normalized: string): number {
  if (normalized.length !== RGBA_HEX_LENGTH) {
    return OPAQUE_PROJECT_BACKGROUND_ALPHA;
  }
  return (
    Number.parseInt(normalized.slice(RGB_HEX_LENGTH), HEX_RADIX) / ALPHA_BYTE_MAX
  );
}

/** Convert `#rrggbb` / `#rrggbbaa` to a Pixi/WebGL clear color integer. */
export function projectBackgroundToPixiColor(hex: string): number {
  return projectBackgroundToClear(hex).color;
}

/** Convert `#rrggbb` / `#rrggbbaa` to a 0–1 canvas clear alpha. */
export function projectBackgroundToPixiAlpha(hex: string): number {
  return projectBackgroundToClear(hex).alpha;
}

/** RGB integer + 0–1 alpha for Pixi/Three Application clear. */
export function projectBackgroundToClear(hex: string): ProjectBackgroundClear {
  const normalized = normalizeProjectBackgroundHex(hex);
  if (!normalized) {
    throw new Error(`Invalid project background color: ${hex}`);
  }
  return {
    color: rgbIntFromNormalized(normalized),
    alpha: alphaFromNormalized(normalized),
  };
}

/** Named fields for game/preview renderer mount options. */
export function projectBackgroundRendererClear(hex: string): {
  backgroundColor: number;
  backgroundAlpha: number;
} {
  const { color, alpha } = projectBackgroundToClear(hex);
  return { backgroundColor: color, backgroundAlpha: alpha };
}
