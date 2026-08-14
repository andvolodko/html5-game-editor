import { describe, expect, it } from "vitest";
import { aff2FromPose } from "./transform-math.js";

describe("aff2FromPose", () => {
  it("matches rotation-scale when skew is omitted", () => {
    const pose = aff2FromPose({ x: 10, y: 20 }, 0, { x: 2, y: 3 });
    expect(pose.a).toBeCloseTo(2, 10);
    expect(pose.b).toBeCloseTo(0, 10);
    expect(pose.c).toBeCloseTo(0, 10);
    expect(pose.d).toBeCloseTo(3, 10);
    expect(pose.tx).toBe(10);
    expect(pose.ty).toBe(20);
  });

  it("applies Pixi-style skew in degrees", () => {
    const skewX = 37.2422;
    const skewY = -17.1887;
    const pose = aff2FromPose({ x: 0, y: 0 }, 0, { x: 1, y: 1 }, {
      x: skewX,
      y: skewY,
    });
    const skewXRad = (skewX * Math.PI) / 180;
    const skewYRad = (skewY * Math.PI) / 180;
    expect(pose.a).toBeCloseTo(Math.cos(skewYRad), 5);
    expect(pose.b).toBeCloseTo(Math.sin(skewYRad), 5);
    expect(pose.c).toBeCloseTo(-Math.sin(-skewXRad), 5);
    expect(pose.d).toBeCloseTo(Math.cos(-skewXRad), 5);
  });
});
