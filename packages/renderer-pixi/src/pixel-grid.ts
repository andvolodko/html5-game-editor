import { Graphics } from "pixi.js";
import { EDITOR_ACCENT_COLOR } from "./editor-chrome.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

export interface PixelGridStyle {
  /** World-space spacing between minor lines. */
  cellSize: number;
  /** Draw a major line every N minor cells. */
  majorEvery: number;
  minorColor: number;
  majorColor: number;
  axisColor: number;
  minorAlpha: number;
  majorAlpha: number;
  axisAlpha: number;
}

export const DEFAULT_PIXEL_GRID_STYLE: PixelGridStyle = {
  cellSize: 16,
  majorEvery: 8,
  minorColor: 0xffffff,
  majorColor: 0xffffff,
  axisColor: EDITOR_ACCENT_COLOR,
  minorAlpha: 0.06,
  majorAlpha: 0.14,
  axisAlpha: 0.45,
};

/** World-space step for the faint per-pixel overlay (1 world unit = 1 pixel). */
export const PIXEL_LINE_CELL_SIZE = 1;

/**
 * Hide per-pixel lines until 1 world pixel is at least this many screen pixels.
 * Below that the overlay reads as noise and is expensive to stroke.
 */
export const PIXEL_LINE_MIN_SCALE = 4;

export const PIXEL_LINE_COLOR = 0xffffff;
/** Keep pixel lines barely visible; they read clearly once zoomed in. */
export const PIXEL_LINE_ALPHA = 0.05;

/**
 * Inclusive world-space line positions for a 1D grid axis.
 * Pure helper for unit tests and overlay drawing.
 */
export function iterateGridLines(
  min: number,
  max: number,
  cellSize: number,
): number[] {
  if (!(cellSize > 0) || !(max > min)) {
    return [];
  }
  const start = Math.ceil(min / cellSize) * cellSize;
  const lines: number[] = [];
  for (let value = start; value <= max + 1e-9; value += cellSize) {
    lines.push(value);
  }
  return lines;
}

/** True when zoom is high enough for a 1px overlay to be useful. */
export function shouldDrawPixelLines(
  cameraScale: number,
  minScale: number = PIXEL_LINE_MIN_SCALE,
): boolean {
  return Number.isFinite(cameraScale) && cameraScale >= minScale;
}

/**
 * Editor-only pixel grid drawn in world space behind scene content.
 * Does not participate in hit-testing.
 */
export class PixelGridOverlay {
  readonly root = new Graphics();
  private style: PixelGridStyle;
  private minX = 0;
  private minY = 0;
  private maxX = 0;
  private maxY = 0;
  private cameraScale = 1;
  private visible = true;

  constructor(style: Partial<PixelGridStyle> = {}) {
    this.style = { ...DEFAULT_PIXEL_GRID_STYLE, ...style };
    this.root.eventMode = "none";
    this.root.label = "pixel-grid";
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setStyle(style: Partial<PixelGridStyle>): void {
    this.style = { ...this.style, ...style };
    this.redrawBounds(
      this.minX,
      this.minY,
      this.maxX,
      this.maxY,
      this.cameraScale,
    );
  }

  getStyle(): Readonly<PixelGridStyle> {
    return this.style;
  }

  /**
   * Draw grid covering `[0, width] × [0, height]` (legacy screen-sized world).
   */
  redraw(width: number, height: number): void {
    this.redrawBounds(0, 0, width, height);
  }

  /** Draw grid covering an arbitrary world-space AABB (for pan/zoom). */
  redrawBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    cameraScale = this.cameraScale,
  ): void {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.cameraScale = cameraScale;
    this.root.clear();
    if (!this.visible || !(maxX > minX) || !(maxY > minY)) {
      return;
    }

    this.drawPixelLines(minX, minY, maxX, maxY, cameraScale);

    const { cellSize, majorEvery } = this.style;
    const xs = iterateGridLines(minX, maxX, cellSize);
    const ys = iterateGridLines(minY, maxY, cellSize);

    for (const x of xs) {
      const major = isMajorLine(x, cellSize, majorEvery);
      this.root.moveTo(x, minY);
      this.root.lineTo(x, maxY);
      this.root.stroke(this.strokeFor(x === 0, major));
    }
    for (const y of ys) {
      const major = isMajorLine(y, cellSize, majorEvery);
      this.root.moveTo(minX, y);
      this.root.lineTo(maxX, y);
      this.root.stroke(this.strokeFor(y === 0, major));
    }
  }

  destroy(): void {
    this.root.destroy();
  }

  private drawPixelLines(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    cameraScale: number,
  ): void {
    if (!shouldDrawPixelLines(cameraScale)) {
      return;
    }
    const xs = iterateGridLines(minX, maxX, PIXEL_LINE_CELL_SIZE);
    const ys = iterateGridLines(minY, maxY, PIXEL_LINE_CELL_SIZE);
    for (const x of xs) {
      this.root.moveTo(x, minY);
      this.root.lineTo(x, maxY);
    }
    for (const y of ys) {
      this.root.moveTo(minX, y);
      this.root.lineTo(maxX, y);
    }
    this.root.stroke({
      color: PIXEL_LINE_COLOR,
      width: viewportChromeInvScale(cameraScale),
      alpha: PIXEL_LINE_ALPHA,
    });
  }

  private strokeFor(
    axis: boolean,
    major: boolean,
  ): { color: number; width: number; alpha: number } {
    if (axis) {
      return {
        color: this.style.axisColor,
        width: 1,
        alpha: this.style.axisAlpha,
      };
    }
    if (major) {
      return {
        color: this.style.majorColor,
        width: 1,
        alpha: this.style.majorAlpha,
      };
    }
    return {
      color: this.style.minorColor,
      width: 1,
      alpha: this.style.minorAlpha,
    };
  }
}

function isMajorLine(
  value: number,
  cellSize: number,
  majorEvery: number,
): boolean {
  if (!(majorEvery > 0)) {
    return false;
  }
  const index = Math.round(value / cellSize);
  return index % majorEvery === 0;
}
