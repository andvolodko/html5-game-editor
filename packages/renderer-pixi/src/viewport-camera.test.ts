import { describe, expect, it } from "vitest";
import {
  clampViewportScale,
  panByScreenDelta,
  screenToWorld,
  viewportChromeInvScale,
  visibleWorldRect,
  worldToScreen,
  zoomAtScreenPoint,
} from "./viewport-camera.js";

describe("viewport camera math", () => {
  it("clamps scale to preview bounds", () => {
    expect(clampViewportScale(0.01)).toBe(0.1);
    expect(clampViewportScale(99)).toBe(8);
    expect(clampViewportScale(1.5)).toBe(1.5);
  });

  it("maps chrome inverse scale for screen-constant overlays", () => {
    expect(viewportChromeInvScale(2)).toBeCloseTo(0.5, 5);
    expect(viewportChromeInvScale(0.5)).toBeCloseTo(2, 5);
    expect(viewportChromeInvScale(0)).toBe(1);
  });

  it("round-trips screen ↔ world with pan and scale", () => {
    const camera = { pan: { x: 40, y: -20 }, scale: 2 };
    const screen = { x: 140, y: 80 };
    const world = screenToWorld(screen, camera);
    expect(world).toEqual({ x: 50, y: 50 });
    expect(worldToScreen(world, camera)).toEqual(screen);
  });

  it("zooms around an anchor without moving that world point on screen", () => {
    const camera = { pan: { x: 0, y: 0 }, scale: 1 };
    const anchor = { x: 200, y: 100 };
    const worldBefore = screenToWorld(anchor, camera);
    const next = zoomAtScreenPoint(camera, 2, anchor);
    expect(screenToWorld(anchor, next)).toEqual(worldBefore);
    expect(next.scale).toBe(2);
  });

  it("pans in screen space", () => {
    const camera = { pan: { x: 10, y: 20 }, scale: 1 };
    expect(panByScreenDelta(camera, { x: 5, y: -8 })).toEqual({
      pan: { x: 15, y: 12 },
      scale: 1,
    });
  });

  it("computes visible world rect", () => {
    const camera = { pan: { x: 100, y: 50 }, scale: 2 };
    expect(visibleWorldRect(400, 200, camera)).toEqual({
      minX: -50,
      minY: -25,
      maxX: 150,
      maxY: 75,
    });
  });
});
