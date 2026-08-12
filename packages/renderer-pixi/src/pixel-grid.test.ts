import { describe, expect, it } from "vitest";
import { iterateGridLines } from "./pixel-grid.js";

describe("iterateGridLines", () => {
  it("returns inclusive cell-aligned positions", () => {
    expect(iterateGridLines(0, 64, 16)).toEqual([0, 16, 32, 48, 64]);
  });

  it("starts at the first cell at or after min", () => {
    expect(iterateGridLines(5, 40, 10)).toEqual([10, 20, 30, 40]);
  });

  it("returns empty for invalid spacing or range", () => {
    expect(iterateGridLines(0, 100, 0)).toEqual([]);
    expect(iterateGridLines(50, 10, 16)).toEqual([]);
  });
});
