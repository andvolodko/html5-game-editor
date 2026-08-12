import { describe, expect, it } from "vitest";
import { clientPointToWorld } from "./viewport-math.js";

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
