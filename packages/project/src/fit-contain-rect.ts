import type { ProjectResolution } from "./types.js";

/** Axis-aligned rectangle placed inside an available area. */
export interface FittedRect {
  width: number;
  height: number;
  x: number;
  y: number;
  /** Uniform scale applied to design size to produce width/height. */
  scale: number;
}

/**
 * Largest rectangle with `design` aspect ratio that fits inside `available`
 * (CSS object-fit: contain), centered.
 */
export function fitContainRect(
  design: ProjectResolution,
  available: ProjectResolution,
): FittedRect {
  const designWidth = Math.max(design.width, 1);
  const designHeight = Math.max(design.height, 1);
  const availableWidth = Math.max(available.width, 0);
  const availableHeight = Math.max(available.height, 0);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return { width: 0, height: 0, x: 0, y: 0, scale: 0 };
  }

  const scale = Math.min(
    availableWidth / designWidth,
    availableHeight / designHeight,
  );
  const width = designWidth * scale;
  const height = designHeight * scale;
  return {
    width,
    height,
    x: (availableWidth - width) / 2,
    y: (availableHeight - height) / 2,
    scale,
  };
}
