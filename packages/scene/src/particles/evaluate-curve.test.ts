import { describe, expect, it } from "vitest";
import { evaluateCurve } from "./evaluate-curve.js";

describe("evaluateCurve", () => {
  const curve = {
    points: [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ],
  };

  it("returns endpoints at 0 and 1", () => {
    expect(evaluateCurve(curve, 0)).toBe(0);
    expect(evaluateCurve(curve, 1)).toBe(0);
  });

  it("interpolates midpoints linearly", () => {
    expect(evaluateCurve(curve, 0.25)).toBeCloseTo(0.5);
    expect(evaluateCurve(curve, 0.5)).toBeCloseTo(1);
    expect(evaluateCurve(curve, 0.75)).toBeCloseTo(0.5);
  });

  it("clamps outside [0, 1]", () => {
    expect(evaluateCurve(curve, -1)).toBe(0);
    expect(evaluateCurve(curve, 2)).toBe(0);
  });

  it("returns 0 for empty curves", () => {
    expect(evaluateCurve({ points: [] }, 0.5)).toBe(0);
  });
});
