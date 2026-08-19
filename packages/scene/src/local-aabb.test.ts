import { describe, expect, it } from "vitest";
import { aff2FromTransform2D, identityAff2 } from "./transform-math.js";
import { aabbFromCorners, aabbIntersects, transformLocalAabb, unionLocalAabb } from "./local-aabb.js";

describe("local AABB", () => {
  it("returns identity AABB when the pose is identity", () => {
    expect(
      transformLocalAabb({ x: -10, y: -4, width: 20, height: 8 }, identityAff2()),
    ).toEqual({ x: -10, y: -4, width: 20, height: 8 });
  });

  it("returns the AABB of rotated corners", () => {
    const aff = aff2FromTransform2D({
      type: "Transform2D",
      id: "t",
      position: { x: 0, y: 0 },
      rotation: 90,
      scale: { x: 1, y: 1 },
    });
    const box = transformLocalAabb(
      { x: -10, y: -4, width: 20, height: 8 },
      aff,
    );
    expect(box.x).toBeCloseTo(-4, 10);
    expect(box.y).toBeCloseTo(-10, 10);
    expect(box.width).toBeCloseTo(8, 10);
    expect(box.height).toBeCloseTo(20, 10);
  });

  it("unions child boxes and skips empty ones", () => {
    expect(
      unionLocalAabb([
        { x: -32, y: -32, width: 64, height: 64 },
        { x: 68, y: -32, width: 64, height: 64 },
        { x: 0, y: 0, width: 0, height: 10 },
      ]),
    ).toEqual({ x: -32, y: -32, width: 164, height: 64 });
  });

  it("returns undefined when every box is empty", () => {
    expect(unionLocalAabb([{ x: 0, y: 0, width: 0, height: 0 }])).toBeUndefined();
    expect(unionLocalAabb([])).toBeUndefined();
  });

  it("builds a box from either corner order and tests overlap", () => {
    expect(aabbFromCorners({ x: 10, y: 20 }, { x: 4, y: 8 })).toEqual({
      x: 4,
      y: 8,
      width: 6,
      height: 12,
    });
    expect(
      aabbIntersects(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 10, width: 5, height: 5 },
      ),
    ).toBe(true);
    expect(
      aabbIntersects(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 11, y: 0, width: 5, height: 5 },
      ),
    ).toBe(false);
  });
});
