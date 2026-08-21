import { describe, expect, it } from "vitest";
import { evaluateGradient } from "./evaluate-gradient.js";

describe("evaluateGradient", () => {
  const gradient = {
    points: [
      { time: 0, color: 0xff0000 },
      { time: 1, color: 0x0000ff },
    ],
  };

  it("returns endpoints", () => {
    expect(evaluateGradient(gradient, 0)).toBe(0xff0000);
    expect(evaluateGradient(gradient, 1)).toBe(0x0000ff);
  });

  it("interpolates RGB at midpoint", () => {
    expect(evaluateGradient(gradient, 0.5)).toBe(0x800080);
  });

  it("returns white for empty gradients", () => {
    expect(evaluateGradient({ points: [] }, 0.5)).toBe(0xffffff);
  });
});
