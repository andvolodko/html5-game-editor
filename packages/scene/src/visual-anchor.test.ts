import { describe, expect, it } from "vitest";
import {
  createSpriteComponent,
  createTextComponent,
  createNineSliceSpriteComponent,
  DEFAULT_VISUAL_ANCHOR,
  getVisualAnchorOrDefault,
  visualComponentSupportsAnchor,
} from "./index.js";

describe("visual anchor helpers", () => {
  it("reports which leaf visuals support anchor", () => {
    expect(visualComponentSupportsAnchor(createSpriteComponent())).toBe(true);
    expect(visualComponentSupportsAnchor(createTextComponent())).toBe(true);
    expect(
      visualComponentSupportsAnchor(createNineSliceSpriteComponent()),
    ).toBe(false);
  });

  it("defaults omitted anchor to center", () => {
    const sprite = createSpriteComponent();
    expect(sprite.anchor).toBeUndefined();
    expect(getVisualAnchorOrDefault(sprite)).toEqual(DEFAULT_VISUAL_ANCHOR);
  });

  it("returns explicit anchor when set", () => {
    const sprite = createSpriteComponent({ anchor: { x: 0, y: 1 } });
    expect(getVisualAnchorOrDefault(sprite)).toEqual({ x: 0, y: 1 });
  });
});
