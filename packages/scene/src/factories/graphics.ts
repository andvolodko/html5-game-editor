import { createId } from "@game-editor/shared";
import type { GraphicsComponentData } from "../types.js";
import {
  DEFAULT_GRAPHICS_FILL_COLOR,
  DEFAULT_GRAPHICS_SIZE,
  DEFAULT_GRAPHICS_STROKE_COLOR,
} from "../defaults.js";

export function createGraphicsComponent(
  partial?: Partial<Omit<GraphicsComponentData, "type" | "id">> & { id?: string },
): GraphicsComponentData {
  return {
    type: "Graphics",
    id: partial?.id ?? createId("comp"),
    shape: partial?.shape ?? {
      type: "rectangle",
      width: DEFAULT_GRAPHICS_SIZE,
      height: DEFAULT_GRAPHICS_SIZE,
    },
    fillColor: partial?.fillColor ?? DEFAULT_GRAPHICS_FILL_COLOR,
    fillAlpha: partial?.fillAlpha ?? 1,
    strokeColor: partial?.strokeColor ?? DEFAULT_GRAPHICS_STROKE_COLOR,
    strokeAlpha: partial?.strokeAlpha ?? 0,
    strokeWidth: partial?.strokeWidth ?? 0,
  };
}
