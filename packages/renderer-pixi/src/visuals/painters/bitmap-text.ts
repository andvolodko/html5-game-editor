import { BitmapText } from "pixi.js";
import type { BitmapTextComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
} from "../paint-helpers.js";
import {
  BITMAP_FONT_UNASSIGNED_TINT,
  BITMAP_TEXT_PLACEHOLDER_HEIGHT,
  BITMAP_TEXT_PLACEHOLDER_WIDTH,
  EDITOR_CHROME_FILL,
  PLACEHOLDER_MISSING_TINT,
  TEXT_FALLBACK_CHAR_WIDTH_EM,
  TEXT_FALLBACK_LINE_HEIGHT_EM,
} from "../../editor-chrome.js";

export const bitmapTextPainter: PixiVisualPainter = {
  type: "BitmapText",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as BitmapTextComponentData;
    if (!data.fontFamily) {
      destroyVisual(ctx.visual);
      ctx.showPlaceholder(
        BITMAP_TEXT_PLACEHOLDER_WIDTH,
        BITMAP_TEXT_PLACEHOLDER_HEIGHT,
        BITMAP_FONT_UNASSIGNED_TINT,
      );
      console.warn("[renderer] BitmapText has no fontFamily assigned", {
        category: "renderer",
        nodeId: ctx.node.id,
      });
      return {
        visual: undefined,
        visualType: data.type,
        bounds: centeredBounds(
          BITMAP_TEXT_PLACEHOLDER_WIDTH,
          BITMAP_TEXT_PLACEHOLDER_HEIGHT,
        ),
      };
    }
    try {
      ctx.hidePlaceholder();
      let view =
        ctx.visualType === "BitmapText" && ctx.visual instanceof BitmapText
          ? ctx.visual
          : undefined;
      if (!view) {
        destroyVisual(ctx.visual);
        view = new BitmapText({
          text: data.text,
          style: {
            fontFamily: data.fontFamily,
            fontSize: data.fontSize,
            align: data.align,
            letterSpacing: data.letterSpacing,
          },
        });
        ensureChild(ctx.visualsRoot, view);
      } else {
        view.text = data.text;
        view.style.fontFamily = data.fontFamily;
        view.style.fontSize = data.fontSize;
        view.style.align = data.align;
        view.style.letterSpacing = data.letterSpacing;
        ensureChild(ctx.visualsRoot, view);
      }
      if (data.anchor) {
        view.anchor.set(data.anchor.x, data.anchor.y);
      } else {
        view.anchor.set(0.5, 0.5);
      }
      view.tint = data.tint ?? EDITOR_CHROME_FILL;
      view.visible = true;
      return {
        visual: view,
        visualType: data.type,
        bounds: localBoundsOf(
          view,
          anchoredBounds(
            data.fontSize *
              Math.max(1, data.text.length * TEXT_FALLBACK_CHAR_WIDTH_EM),
            data.fontSize * TEXT_FALLBACK_LINE_HEIGHT_EM,
            data.anchor,
          ),
        ),
      };
    } catch (error) {
      console.warn("[renderer] BitmapText paint failed", {
        category: "renderer",
        nodeId: ctx.node.id,
        fontFamily: data.fontFamily,
        error: error instanceof Error ? error.message : String(error),
      });
      destroyVisual(ctx.visual);
      ctx.showPlaceholder(
        BITMAP_TEXT_PLACEHOLDER_WIDTH,
        BITMAP_TEXT_PLACEHOLDER_HEIGHT,
        PLACEHOLDER_MISSING_TINT,
      );
      return {
        visual: undefined,
        visualType: data.type,
        bounds: centeredBounds(
          BITMAP_TEXT_PLACEHOLDER_WIDTH,
          BITMAP_TEXT_PLACEHOLDER_HEIGHT,
        ),
      };
    }
  },
};
