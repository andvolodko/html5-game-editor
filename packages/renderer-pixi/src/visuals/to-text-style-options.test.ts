import { describe, expect, it } from "vitest";
import { FillGradient } from "pixi.js";
import { createDefaultTextStyle } from "@game-editor/scene";
import { toTextStyleOptions } from "./to-text-style-options.js";

describe("toTextStyleOptions", () => {
  it("maps fill alpha, stroke, and disabled drop shadow", () => {
    const options = toTextStyleOptions(
      createDefaultTextStyle({
        fill: 0x336699,
        fillAlpha: 0.5,
        strokeColor: 0xff0000,
        strokeWidth: 2,
        strokeAlpha: 0.8,
      }),
    );

    expect(options.fill).toEqual({ color: 0x336699, alpha: 0.5 });
    expect(options.dropShadow).toBe(false);
    expect(options.breakWords).toBe(false);
    expect(options.padding).toBe(0);
    expect(options.fontVariant).toBe("normal");
    expect(options.whiteSpace).toBe("pre");
    expect(options.trim).toBe(false);
    expect(options.textBaseline).toBe("alphabetic");
    expect(options.leading).toBe(0);
    expect(options.stroke).toEqual({
      color: 0xff0000,
      width: 2,
      alpha: 0.8,
      join: "miter",
      miterLimit: 10,
    });
  });

  it("converts drop-shadow angle from degrees to radians", () => {
    const options = toTextStyleOptions(
      createDefaultTextStyle({
        dropShadow: true,
        dropShadowColor: 0x111111,
        dropShadowAlpha: 0.4,
        dropShadowBlur: 3,
        dropShadowDistance: 8,
        dropShadowAngle: 90,
      }),
    );

    expect(options.dropShadow).toEqual({
      color: 0x111111,
      alpha: 0.4,
      blur: 3,
      distance: 8,
      angle: Math.PI / 2,
    });
  });

  it("maps font variant, whitespace, baseline, and stroke join", () => {
    const options = toTextStyleOptions(
      createDefaultTextStyle({
        fontVariant: "small-caps",
        whiteSpace: "pre-line",
        textBaseline: "middle",
        trim: true,
        leading: 6,
        strokeJoin: "round",
        miterLimit: 4,
      }),
    );

    expect(options.fontVariant).toBe("small-caps");
    expect(options.whiteSpace).toBe("pre-line");
    expect(options.textBaseline).toBe("middle");
    expect(options.trim).toBe(true);
    expect(options.leading).toBe(6);
    expect(options.stroke).toMatchObject({ join: "round", miterLimit: 4 });
  });

  it("maps two-or-more fill stops to a vertical FillGradient", () => {
    const options = toTextStyleOptions(
      createDefaultTextStyle({
        fill: [0xffffff, 0x00ff99],
      }),
    );

    expect(options.fill).toBeInstanceOf(FillGradient);
    const gradient = options.fill as FillGradient;
    expect(gradient.type).toBe("linear");
    expect(gradient.start).toEqual({ x: 0, y: 0 });
    expect(gradient.end).toEqual({ x: 0, y: 1 });
    expect(gradient.colorStops).toHaveLength(2);
    gradient.destroy();
  });
});
