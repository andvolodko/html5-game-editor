import type { TextStyleData } from "@game-editor/scene";

const DEGREES_TO_RADIANS = Math.PI / 180;

/** Map serialized text style to Pixi `TextStyle` constructor/assign options. */
export function toTextStyleOptions(style: TextStyleData): Record<string, unknown> {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontVariant: style.fontVariant,
    fill: { color: style.fill, alpha: style.fillAlpha },
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
