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
});
