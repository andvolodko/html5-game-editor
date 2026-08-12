import { createId } from "@game-editor/shared";
import type {
  BitmapTextComponentData,
  HTMLTextComponentData,
  TextComponentData,
  TextStyleData,
} from "../types.js";
import {
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FONT_SIZE,
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
    fill: partial?.fill ?? DEFAULT_TEXT_FILL,
    align: partial?.align ?? "left",
    letterSpacing: partial?.letterSpacing ?? 0,
    lineHeight: partial?.lineHeight ?? 0,
    wordWrap: partial?.wordWrap ?? false,
    wordWrapWidth: partial?.wordWrapWidth ?? DEFAULT_TEXT_WORD_WRAP_WIDTH,
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
