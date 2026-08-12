/** Strict CSS hex used in project.json (`#RRGGBB`). */
export const PROJECT_BACKGROUND_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Normalize to lowercase `#rrggbb`, or `undefined` if invalid. */
export function normalizeProjectBackgroundHex(
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!PROJECT_BACKGROUND_HEX_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed.toLowerCase();
}

/** Convert `#rrggbb` to a Pixi/WebGL clear color integer. */
export function projectBackgroundToPixiColor(hex: string): number {
  const normalized = normalizeProjectBackgroundHex(hex);
  if (!normalized) {
    throw new Error(`Invalid project background color: ${hex}`);
  }
  return Number.parseInt(normalized.slice(1), 16);
}
