import { describe, expect, it } from "vitest";
import {
  clampSnapGridSize,
  DEFAULT_SNAP_GRID_SIZE,
  MAX_SNAP_GRID_SIZE,
  MIN_SNAP_GRID_SIZE,
  snapPositionToGrid,
  snapValueToGrid,
} from "./snap-to-grid.js";

describe("snapToGrid", () => {
  it("uses 1px as the default snap size", () => {
    expect(DEFAULT_SNAP_GRID_SIZE).toBe(1);
    expect(MIN_SNAP_GRID_SIZE).toBe(1);
  });

  it("rounds to nearest grid cell", () => {
    expect(snapValueToGrid(1.4, 1)).toBe(1);
    expect(snapValueToGrid(1.5, 1)).toBe(2);
    expect(snapValueToGrid(-1.6, 1)).toBe(-2);
    expect(snapValueToGrid(17, 8)).toBe(16);
  });

  it("leaves values unchanged for non-positive grid size", () => {
    expect(snapValueToGrid(3.2, 0)).toBe(3.2);
    expect(snapValueToGrid(3.2, -1)).toBe(3.2);
  });

  it("snaps both position axes", () => {
    expect(snapPositionToGrid({ x: 10.4, y: -2.6 }, 1)).toEqual({
      x: 10,
      y: -3,
    });
  });

  it("clamps snap grid size to a positive integer range", () => {
    expect(clampSnapGridSize(0)).toBe(DEFAULT_SNAP_GRID_SIZE);
    expect(clampSnapGridSize(-4)).toBe(DEFAULT_SNAP_GRID_SIZE);
    expect(clampSnapGridSize(Number.NaN)).toBe(DEFAULT_SNAP_GRID_SIZE);
    expect(clampSnapGridSize(16.7)).toBe(17);
    expect(clampSnapGridSize(MAX_SNAP_GRID_SIZE + 50)).toBe(MAX_SNAP_GRID_SIZE);
  });
});
