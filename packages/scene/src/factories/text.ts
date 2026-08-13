import { createId } from "@game-editor/shared";
import type {
  BitmapTextComponentData,
  HTMLTextComponentData,
  TextComponentData,
  TextStyleData,
} from "../types.js";
import {
  DEFAULT_TEXT_DROP_SHADOW_ALPHA,
  DEFAULT_TEXT_DROP_SHADOW_ANGLE_DEGREES,
  DEFAULT_TEXT_DROP_SHADOW_COLOR,
  DEFAULT_TEXT_DROP_SHADOW_DISTANCE,
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FILL_ALPHA,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_MITER_LIMIT,
  DEFAULT_TEXT_PADDING,
  DEFAULT_TEXT_STROKE_ALPHA,
  DEFAULT_TEXT_STROKE_COLOR,
  DEFAULT_TEXT_WORD_WRAP_WIDTH,
} from "../defaults.js";

export function createDefaultTextStyle(
  partial?: Partial<TextStyleData>,
): TextStyleData {
  return {
    fontFamily: partial?.fontFamily ?? "Arial",
    fontSize: partial?.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
    fontWeight: partial?.fontWeight ?? "normal",
    fontStyle: partial?.fontStyle ?? "normal",
    fontVariant: partial?.fontVariant ?? "normal",
    fill: partial?.fill ?? DEFAULT_TEXT_FILL,
    fillAlpha: partial?.fillAlpha ?? DEFAULT_TEXT_FILL_ALPHA,
    align: partial?.align ?? "left",
    letterSpacing: partial?.letterSpacing ?? 0,
    lineHeight: partial?.lineHeight ?? 0,
    leading: partial?.leading ?? 0,
    wordWrap: partial?.wordWrap ?? false,
    wordWrapWidth: partial?.wordWrapWidth ?? DEFAULT_TEXT_WORD_WRAP_WIDTH,
    breakWords: partial?.breakWords ?? false,
    whiteSpace: partial?.whiteSpace ?? "pre",
    padding: partial?.padding ?? DEFAULT_TEXT_PADDING,
    trim: partial?.trim ?? false,
    textBaseline: partial?.textBaseline ?? "alphabetic",
    strokeColor: partial?.strokeColor ?? DEFAULT_TEXT_STROKE_COLOR,
    strokeAlpha: partial?.strokeAlpha ?? DEFAULT_TEXT_STROKE_ALPHA,
    strokeWidth: partial?.strokeWidth ?? 0,
    strokeJoin: partial?.strokeJoin ?? "miter",
    miterLimit: partial?.miterLimit ?? DEFAULT_TEXT_MITER_LIMIT,
    dropShadow: partial?.dropShadow ?? false,
    dropShadowColor: partial?.dropShadowColor ?? DEFAULT_TEXT_DROP_SHADOW_COLOR,
    dropShadowAlpha: partial?.dropShadowAlpha ?? DEFAULT_TEXT_DROP_SHADOW_ALPHA,
    dropShadowBlur: partial?.dropShadowBlur ?? 0,
    dropShadowDistance:
      partial?.dropShadowDistance ?? DEFAULT_TEXT_DROP_SHADOW_DISTANCE,
    dropShadowAngle:
      partial?.dropShadowAngle ?? DEFAULT_TEXT_DROP_SHADOW_ANGLE_DEGREES,
  };
}

export function createTextComponent(
  partial?: Partial<Omit<TextComponentData, "type" | "id">> & { id?: string },
): TextComponentData {
  const data: TextComponentData = {
    type: "Text",
    id: partial?.id ?? createId("comp"),
    text: partial?.text ?? "Text",
    style: createDefaultTextStyle(partial?.style),
  };
  if (partial?.anchor !== undefined) {
    data.anchor = { ...partial.anchor };
  }
  return data;
}

export function createBitmapTextComponent(
  partial?: Partial<Omit<BitmapTextComponentData, "type" | "id">> & {
    id?: string;
  },
): BitmapTextComponentData {
  const data: BitmapTextComponentData = {
    type: "BitmapText",
    id: partial?.id ?? createId("comp"),
    text: partial?.text ?? "Bitmap Text",
    fontSize: partial?.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
    align: partial?.align ?? "left",
    letterSpacing: partial?.letterSpacing ?? 0,
  };
  if (partial?.fontFamily !== undefined) {
    data.fontFamily = partial.fontFamily;
  }
  if (partial?.tint !== undefined) {
    data.tint = partial.tint;
  }
  if (partial?.anchor !== undefined) {
    data.anchor = { ...partial.anchor };
  }
  return data;
}

export function createHTMLTextComponent(
  partial?: Partial<Omit<HTMLTextComponentData, "type" | "id">> & {
    id?: string;
  },
): HTMLTextComponentData {
  const data: HTMLTextComponentData = {
    type: "HTMLText",
    id: partial?.id ?? createId("comp"),
    text: partial?.text ?? "HTML Text",
    style: createDefaultTextStyle(partial?.style),
  };
  if (partial?.anchor !== undefined) {
    data.anchor = { ...partial.anchor };
  }
  return data;
}
