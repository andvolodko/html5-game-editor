import { FillGradient, type TextStyle } from "pixi.js";
import {
  DEFAULT_TEXT_FILL,
  textStyleFillStops,
  type TextStyleData,
} from "@game-editor/scene";

const DEGREES_TO_RADIANS = Math.PI / 180;
const TEXT_GRADIENT_MIN_STOPS = 2;
/** Local-space top of a vertical fill (Pixi v7 `fill: color[]` default). */
const VERTICAL_FILL_GRADIENT_START = { x: 0, y: 0 };
/** Local-space bottom of a vertical fill. */
const VERTICAL_FILL_GRADIENT_END = { x: 0, y: 1 };

function fillGradientOf(fill: unknown): FillGradient | undefined {
  if (fill instanceof FillGradient) {
    return fill;
  }
  if (
    fill !== null &&
    typeof fill === "object" &&
    "fill" in fill &&
    fill.fill instanceof FillGradient
  ) {
    return fill.fill;
  }
  return undefined;
}

function toPixiFill(style: TextStyleData): unknown {
  const stops = textStyleFillStops(style.fill);
  if (stops.length >= TEXT_GRADIENT_MIN_STOPS) {
    const lastIndex = stops.length - 1;
    const gradient = new FillGradient({
      type: "linear",
      start: VERTICAL_FILL_GRADIENT_START,
      end: VERTICAL_FILL_GRADIENT_END,
      colorStops: stops.map((color, index) => ({
        offset: index / lastIndex,
        color,
      })),
    });
    if (style.fillAlpha < 1) {
      return { fill: gradient, alpha: style.fillAlpha };
    }
    return gradient;
  }
  return { color: stops[0] ?? DEFAULT_TEXT_FILL, alpha: style.fillAlpha };
}

/** Map serialized text style to Pixi `TextStyle` constructor/assign options. */
export function toTextStyleOptions(style: TextStyleData): Record<string, unknown> {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontVariant: style.fontVariant,
    fill: toPixiFill(style),
    align: style.align,
    letterSpacing: style.letterSpacing,
    ...(style.lineHeight > 0 ? { lineHeight: style.lineHeight } : {}),
    leading: style.leading,
    wordWrap: style.wordWrap,
    wordWrapWidth: style.wordWrapWidth,
    breakWords: style.breakWords,
    whiteSpace: style.whiteSpace,
    padding: style.padding,
    trim: style.trim,
    textBaseline: style.textBaseline,
    stroke: {
      color: style.strokeColor,
      width: style.strokeWidth,
      alpha: style.strokeAlpha,
      join: style.strokeJoin,
      miterLimit: style.miterLimit,
    },
    dropShadow: style.dropShadow
      ? {
          color: style.dropShadowColor,
          alpha: style.dropShadowAlpha,
          blur: style.dropShadowBlur,
          distance: style.dropShadowDistance,
          angle: style.dropShadowAngle * DEGREES_TO_RADIANS,
        }
      : false,
  };
}

/** Assign style options and destroy a previous FillGradient so updates do not leak textures. */
export function assignPixiTextStyle(style: TextStyle, data: TextStyleData): void {
  const previous = fillGradientOf(style.fill);
  Object.assign(style, toTextStyleOptions(data));
  const next = fillGradientOf(style.fill);
  if (previous && previous !== next) {
    previous.destroy();
  }
}
