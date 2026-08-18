import { describe, expect, it } from "vitest";
import { createMaskComponent } from "./factories/mask.js";
import {
  getMaskOffset,
  getMaskSpriteSize,
  isMaskEnabled,
  isMaskInverse,
  maskAsHitZone,
  maskLocalAabb,
} from "./mask.js";

describe("mask helpers", () => {
  it("treats omitted flags as enabled, not inverse, origin offset", () => {
    const mask = createMaskComponent();
    expect(isMaskEnabled(mask)).toBe(true);
    expect(isMaskInverse(mask)).toBe(false);
    expect(getMaskOffset(mask)).toEqual({ x: 0, y: 0 });
  });

  it("maps shape mode to HitZone geometry for shared AABB math", () => {
    const mask = createMaskComponent({
      offset: { x: 10, y: 0 },
      shape: { type: "rectangle", width: 40, height: 20 },
    });
    expect(maskLocalAabb(mask)).toEqual({
      x: -10,
      y: -10,
      width: 40,
      height: 20,
    });
    expect(maskAsHitZone(mask)?.shape).toEqual({
      type: "rectangle",
      width: 40,
      height: 20,
    });
  });

  it("uses sprite display size for AABB and defaults when omitted", () => {
    const unassigned = createMaskComponent({ mode: "sprite" });
    expect(getMaskSpriteSize(unassigned)).toEqual({ width: 100, height: 100 });
    const sized = createMaskComponent({
      mode: "sprite",
      width: 32,
      height: 16,
    });
    expect(maskLocalAabb(sized)).toEqual({
      x: -16,
      y: -8,
      width: 32,
      height: 16,
    });
  });
});
