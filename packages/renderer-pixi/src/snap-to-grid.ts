import type { Vec2 } from "@game-editor/scene";

/** Default world-space snap cell size (1px). */
export const DEFAULT_SNAP_GRID_SIZE = 1;
/** Smallest allowed snap cell size in world pixels. */
export const MIN_SNAP_GRID_SIZE = 1;
/** Upper bound so accidental huge values do not lock the editor. */
export const MAX_SNAP_GRID_SIZE = 1024;

/**
 * Clamp a user-entered snap size to a positive finite world-pixel range.
 * Non-finite / non-positive values fall back to `DEFAULT_SNAP_GRID_SIZE`.
 */
export function clampSnapGridSize(value: number): number {
  if (!Number.isFinite(value) || value < MIN_SNAP_GRID_SIZE) {
    return DEFAULT_SNAP_GRID_SIZE;
  }
  return Math.min(MAX_SNAP_GRID_SIZE, Math.round(value));
}

/**
 * Quantize a scalar to the nearest multiple of `gridSize`.
 * Returns `value` unchanged when `gridSize` is not positive.
 */
export function snapValueToGrid(value: number, gridSize: number): number {
  if (!(gridSize > 0) || !Number.isFinite(value)) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

/** Quantize both axes of a world position to the snap grid. */
export function snapPositionToGrid(position: Vec2, gridSize: number): Vec2 {
  return {
    x: snapValueToGrid(position.x, gridSize),
    y: snapValueToGrid(position.y, gridSize),
  };
}
