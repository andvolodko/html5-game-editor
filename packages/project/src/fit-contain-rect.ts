import type { ProjectResolution, ProjectScaleMode } from "./types.js";

/** Axis-aligned rectangle placed inside an available area. */
export interface FittedRect {
  width: number;
  height: number;
  x: number;
  y: number;
  /** Uniform scale applied to design size to produce the design rectangle. */
  scale: number;
}

/** Expand layout: full host CSS box plus visible world size and design offset. */
export interface ExpandedFit extends FittedRect {
  /** Backbuffer size in design pixels (may exceed design on one axis). */
  visibleWidth: number;
  visibleHeight: number;
  /** Screen-space pan so the design rectangle stays centered. */
  offsetX: number;
  offsetY: number;
}

function fitUniformRect(
  design: ProjectResolution,
  available: ProjectResolution,
  pickScale: (widthRatio: number, heightRatio: number) => number,
): FittedRect {
  const designWidth = Math.max(design.width, 1);
  const designHeight = Math.max(design.height, 1);
  const availableWidth = Math.max(available.width, 0);
  const availableHeight = Math.max(available.height, 0);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return { width: 0, height: 0, x: 0, y: 0, scale: 0 };
  }

  const scale = pickScale(
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

/**
 * Largest rectangle with `design` aspect ratio that fits inside `available`
 * (CSS object-fit: contain), centered.
 */
export function fitContainRect(
  design: ProjectResolution,
  available: ProjectResolution,
): FittedRect {
  return fitUniformRect(design, available, Math.min);
}

/**
 * Smallest rectangle with `design` aspect ratio that covers `available`
 * (CSS object-fit: cover), centered. `x`/`y` may be negative (clip overflow).
 */
export function fitCoverRect(
  design: ProjectResolution,
  available: ProjectResolution,
): FittedRect {
  return fitUniformRect(design, available, Math.max);
}

/**
 * Fit the design with contain scale, then grow the view to fill `available`.
 * Extra world is symmetric so the design rectangle stays centered.
 * The CSS frame is the full host (`x`/`y` = 0).
 */
export function fitExpandRect(
  design: ProjectResolution,
  available: ProjectResolution,
): ExpandedFit {
  const contained = fitContainRect(design, available);
  if (contained.scale === 0) {
    return {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      scale: 0,
      visibleWidth: 0,
      visibleHeight: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }
  const designWidth = Math.max(design.width, 1);
  const designHeight = Math.max(design.height, 1);
  const visibleWidth = available.width / contained.scale;
  const visibleHeight = available.height / contained.scale;
  return {
    width: available.width,
    height: available.height,
    x: 0,
    y: 0,
    scale: contained.scale,
    visibleWidth,
    visibleHeight,
    offsetX: (visibleWidth - designWidth) / 2,
    offsetY: (visibleHeight - designHeight) / 2,
  };
}

/** Contain, cover, or expand fit of a design resolution inside a host box. */
export function fitDesignRect(
  design: ProjectResolution,
  available: ProjectResolution,
  mode: ProjectScaleMode,
): FittedRect {
  if (mode === "cover") {
    return fitCoverRect(design, available);
  }
  if (mode === "expand") {
    return fitExpandRect(design, available);
  }
  return fitContainRect(design, available);
}

const MIN_EXPAND_BUFFER = 1;

/**
 * Integer backbuffer + centered pan for expand-fit inside a CSS parent.
 */
export function integerExpandBuffer(
  design: ProjectResolution,
  available: ProjectResolution,
): { width: number; height: number; panX: number; panY: number } {
  const layout = fitExpandRect(design, available);
  const designWidth = Math.max(design.width, MIN_EXPAND_BUFFER);
  const designHeight = Math.max(design.height, MIN_EXPAND_BUFFER);
  if (layout.scale === 0) {
    return {
      width: designWidth,
      height: designHeight,
      panX: 0,
      panY: 0,
    };
  }
  const width = Math.max(MIN_EXPAND_BUFFER, Math.round(layout.visibleWidth));
  const height = Math.max(MIN_EXPAND_BUFFER, Math.round(layout.visibleHeight));
  return {
    width,
    height,
    panX: (width - designWidth) / 2,
    panY: (height - designHeight) / 2,
  };
}
