import { describe, expect, it } from "vitest";
import { fitContainRect } from "./fit-contain-rect.js";

describe("fitContainRect", () => {
  it("letterboxes a wide design in a tall host", () => {
    const fitted = fitContainRect(
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    );
    expect(fitted.width).toBeCloseTo(800, 5);
    expect(fitted.height).toBeCloseTo(450, 5);
    expect(fitted.x).toBeCloseTo(0, 5);
    expect(fitted.y).toBeCloseTo(175, 5);
    expect(fitted.scale).toBeCloseTo(800 / 1280, 5);
  });

  it("pillarboxes a tall design in a wide host", () => {
    const fitted = fitContainRect(
      { width: 720, height: 1280 },
      { width: 1000, height: 500 },
    );
    expect(fitted.width).toBeCloseTo(281.25, 5);
    expect(fitted.height).toBeCloseTo(500, 5);
    expect(fitted.x).toBeCloseTo((1000 - 281.25) / 2, 5);
    expect(fitted.y).toBeCloseTo(0, 5);
  });

  it("fills when aspects match", () => {
    const fitted = fitContainRect(
      { width: 1920, height: 1080 },
      { width: 960, height: 540 },
    );
    expect(fitted).toEqual({
      width: 960,
      height: 540,
      x: 0,
      y: 0,
      scale: 0.5,
    });
  });

  it("returns zero size when host has no area", () => {
    expect(
      fitContainRect({ width: 1280, height: 720 }, { width: 0, height: 100 }),
    ).toEqual({ width: 0, height: 0, x: 0, y: 0, scale: 0 });
  });
});
