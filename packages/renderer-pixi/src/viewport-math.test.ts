import { describe, expect, it } from "vitest";
import { clientPointToScreen, clientPointToWorld } from "./viewport-math.js";

describe("clientPointToScreen", () => {
  it("maps CSS canvas pixels onto the renderer screen", () => {
    const point = clientPointToScreen({
      clientX: 50,
      clientY: 25,
      canvasLeft: 0,
      canvasTop: 0,
      canvasWidth: 100,
      canvasHeight: 50,
      screenWidth: 1920,
      screenHeight: 1080,
    });
    expect(point).toEqual({ x: 960, y: 540 });
  });
});

describe("clientPointToWorld", () => {
  it("maps canvas center to screen center", () => {
    const point = clientPointToWorld({
      clientX: 150,
      clientY: 100,
      canvasLeft: 50,
      canvasTop: 50,
      canvasWidth: 200,
      canvasHeight: 100,
      screenWidth: 800,
      screenHeight: 400,
    });
    expect(point).toEqual({ x: 400, y: 200 });
  });

  it("applies preview pan and scale", () => {
    const point = clientPointToWorld({
      clientX: 150,
      clientY: 100,
      canvasLeft: 50,
      canvasTop: 50,
      canvasWidth: 200,
      canvasHeight: 100,
      screenWidth: 800,
      screenHeight: 400,
      panX: 100,
      panY: 50,
      scale: 2,
    });
    expect(point).toEqual({ x: 150, y: 75 });
  });
});
