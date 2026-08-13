import { describe, expect, it } from "vitest";
import { formatPerformanceMeterText } from "./performance-meter.js";

describe("formatPerformanceMeterText", () => {
  it("formats Cocos-style rows with aligned values", () => {
    const text = formatPerformanceMeterText({
      frameTimeMs: 0.98,
      fps: 59.98,
      drawCalls: 4,
      triangles: 15676,
      displayObjects: 128,
      gameLogicMs: 0.09,
      rendererMs: 0.89,
      canvas: 2,
    });
    expect(text).toBe(
      [
        "Frame time (ms)   0.98",
        "Framerate (FPS)   59.98",
        "Draw call         4",
        "Triangle          15676",
        "Display Objects   128",
        "Game Logic (ms)   0.09",
        "Renderer (ms)     0.89",
        "Canvas            2",
      ].join("\n"),
    );
  });

  it("shows Pixi and Three graph counters when both slices are present", () => {
    const text = formatPerformanceMeterText({
      frameTimeMs: 16.67,
      fps: 60,
      drawCalls: 12,
      triangles: 20000,
      displayObjects: 170,
      gameLogicMs: 1.2,
      rendererMs: 4.5,
      canvas: 2,
      pixi: {
        drawCalls: 4,
        triangles: 5000,
        displayObjects: 128,
        canvas: 1,
      },
      three: {
        drawCalls: 8,
        triangles: 15000,
        displayObjects: 42,
        canvas: 1,
      },
    });
    expect(text).toContain("Pixi Draw call");
    expect(text).toContain("4");
    expect(text).toContain("Three Draw call");
    expect(text).toContain("8");
    expect(text).toContain("Pixi Triangle");
    expect(text).toContain("5000");
    expect(text).toContain("Three Triangle");
    expect(text).toContain("15000");
    expect(text).toContain("Pixi Display Objects");
    expect(text).toContain("128");
    expect(text).toContain("Three Display Objects");
    expect(text).toContain("42");
    expect(text).not.toMatch(/^Draw call /m);
  });
});
