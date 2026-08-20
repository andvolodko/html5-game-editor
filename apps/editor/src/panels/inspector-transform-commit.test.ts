import { describe, expect, it } from "vitest";
import {
  createSpriteSizeDraft,
  createTransform2DDraft,
  createTransform3DDraft,
  transform2DOverridePath,
} from "./inspector-transform-commit";

describe("transform2DOverridePath", () => {
  it("maps draft keys to prefab override paths", () => {
    expect(transform2DOverridePath("x")).toBe("position.x");
    expect(transform2DOverridePath("y")).toBe("position.y");
    expect(transform2DOverridePath("rotation")).toBe("rotation");
    expect(transform2DOverridePath("scaleX")).toBe("scale.x");
    expect(transform2DOverridePath("scaleY")).toBe("scale.y");
    expect(transform2DOverridePath("skewX")).toBe("skew.x");
    expect(transform2DOverridePath("skewY")).toBe("skew.y");
  });
});

describe("createTransform2DDraft", () => {
  it("formats pose, skew, and default center anchor", () => {
    const draft = createTransform2DDraft(
      { skew: { x: 1, y: 2 } },
      {
        position: { x: 10, y: 20 },
        rotation: 45,
        scale: { x: 1, y: -1 },
      },
      undefined,
    );
    expect(draft.x).toBe("10");
    expect(draft.y).toBe("20");
    expect(draft.rotation).toBe("45");
    expect(draft.scaleX).toBe("1");
    expect(draft.scaleY).toBe("-1");
    expect(draft.skewX).toBe("1");
    expect(draft.skewY).toBe("2");
    expect(draft.anchorX).toBe("0.5");
    expect(draft.anchorY).toBe("0.5");
  });
});

describe("createTransform3DDraft", () => {
  it("formats position, rotation, and scale", () => {
    const draft = createTransform3DDraft({
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      scale: { x: 1, y: 1, z: 2 },
    });
    expect(draft.z).toBe("3");
    expect(draft.rotY).toBe("90");
    expect(draft.scaleZ).toBe("2");
  });
});

describe("createSpriteSizeDraft", () => {
  it("formats width and height", () => {
    expect(createSpriteSizeDraft({ width: 128, height: 64 })).toEqual({
      width: "128",
      height: "64",
    });
  });
});
