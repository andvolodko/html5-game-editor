import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN_GUIDES_STYLE,
  POPULAR_SCREEN_PRESETS,
  ScreenGuidesOverlay,
} from "./screen-guides.js";

describe("screen guides presets", () => {
  it("includes both landscape and portrait popular sizes", () => {
    const orientations = new Set(
      POPULAR_SCREEN_PRESETS.map((preset) => preset.orientation),
    );
    expect(orientations.has("landscape")).toBe(true);
    expect(orientations.has("portrait")).toBe(true);
    expect(POPULAR_SCREEN_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it("defaults to dashed-friendly opacity for lines and labels", () => {
    expect(DEFAULT_SCREEN_GUIDES_STYLE.lineAlpha).toBe(0.4);
    expect(DEFAULT_SCREEN_GUIDES_STYLE.labelAlpha).toBe(0.4);
    expect(DEFAULT_SCREEN_GUIDES_STYLE.dashLength).toBeGreaterThan(0);
    expect(DEFAULT_SCREEN_GUIDES_STYLE.dashGap).toBeGreaterThan(0);
  });

  it("filters by orientation without throwing", () => {
    const overlay = new ScreenGuidesOverlay();
    overlay.setOrientationFilter({ landscape: false, portrait: true });
    expect(overlay.getOrientationFilter()).toEqual({
      landscape: false,
      portrait: true,
    });
    overlay.destroy();
  });
});
