import { describe, expect, it } from "vitest";
import {
  iterateGridLines,
  PIXEL_LINE_CELL_SIZE,
  PIXEL_LINE_MIN_SCALE,
  shouldDrawPixelLines,
} from "./pixel-grid.js";

describe("iterateGridLines", () => {
  it("returns inclusive cell-aligned positions", () => {
    expect(iterateGridLines(0, 64, 16)).toEqual([0, 16, 32, 48, 64]);
  });

  it("starts at the first cell at or after min", () => {
    expect(iterateGridLines(5, 40, 10)).toEqual([10, 20, 30, 40]);
  });

  it("steps by one world pixel", () => {
    expect(iterateGridLines(0, 4, PIXEL_LINE_CELL_SIZE)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("returns empty for invalid spacing or range", () => {
    expect(iterateGridLines(0, 100, 0)).toEqual([]);
    expect(iterateGridLines(50, 10, 16)).toEqual([]);
  });
});

describe("shouldDrawPixelLines", () => {
  it("hides the overlay until zoom is high enough", () => {
    expect(shouldDrawPixelLines(1)).toBe(false);
    expect(shouldDrawPixelLines(PIXEL_LINE_MIN_SCALE - 0.01)).toBe(false);
  });

  it("shows the overlay at and above the min scale", () => {
    expect(shouldDrawPixelLines(PIXEL_LINE_MIN_SCALE)).toBe(true);
    expect(shouldDrawPixelLines(PIXEL_LINE_MIN_SCALE * 2)).toBe(true);
  });
});
