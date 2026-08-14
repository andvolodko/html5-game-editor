import { describe, expect, it } from "vitest";
import {
  createSpriteComponent,
  createTextComponent,
  createNineSliceSpriteComponent,
  createTilingSpriteComponent,
  createGraphicsComponent,
  DEFAULT_NINE_SLICE_HEIGHT,
  DEFAULT_NINE_SLICE_WIDTH,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_TILING_SPRITE_SIZE,
  DEFAULT_VISUAL_ANCHOR,
  defaultVisualDisplaySize,
  getVisualAnchorOrDefault,
  getVisualDisplaySize,
  visualComponentSupportsAnchor,
  visualComponentSupportsDisplaySize,
} from "./index.js";

describe("visual anchor helpers", () => {
  it("reports which leaf visuals support anchor", () => {
    expect(visualComponentSupportsAnchor(createSpriteComponent())).toBe(true);
    expect(visualComponentSupportsAnchor(createTextComponent())).toBe(true);
    expect(
      visualComponentSupportsAnchor(createNineSliceSpriteComponent()),
    ).toBe(false);
  });

  it("reports which leaf visuals support display size", () => {
    expect(visualComponentSupportsDisplaySize(createSpriteComponent())).toBe(
      true,
    );
    expect(
      visualComponentSupportsDisplaySize(createNineSliceSpriteComponent()),
    ).toBe(true);
    expect(
      visualComponentSupportsDisplaySize(createTilingSpriteComponent()),
    ).toBe(true);
    expect(visualComponentSupportsDisplaySize(createTextComponent())).toBe(
      false,
    );
    expect(visualComponentSupportsDisplaySize(createGraphicsComponent())).toBe(
      false,
    );
    expect(getVisualDisplaySize(createSpriteComponent({ width: 64, height: 32 }))).toEqual(
      { width: 64, height: 32 },
    );
  });

  it("returns factory default display size per visual type", () => {
    expect(defaultVisualDisplaySize(createSpriteComponent())).toEqual({
      width: DEFAULT_SPRITE_SIZE,
      height: DEFAULT_SPRITE_SIZE,
    });
    expect(
      defaultVisualDisplaySize(createNineSliceSpriteComponent()),
    ).toEqual({
      width: DEFAULT_NINE_SLICE_WIDTH,
      height: DEFAULT_NINE_SLICE_HEIGHT,
    });
    expect(defaultVisualDisplaySize(createTilingSpriteComponent())).toEqual({
      width: DEFAULT_TILING_SPRITE_SIZE,
      height: DEFAULT_TILING_SPRITE_SIZE,
    });
    expect(defaultVisualDisplaySize(createTextComponent())).toBeUndefined();
    expect(defaultVisualDisplaySize(createGraphicsComponent())).toBeUndefined();
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
