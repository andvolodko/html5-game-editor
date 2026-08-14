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
import { loadBitmapFont } from "../../load-bitmap-font.js";

function unassignedResult(
  ctx: Parameters<PixiVisualPainter["paint"]>[0],
  type: string,
): VisualPaintResult {
  destroyVisual(ctx.visual);
  ctx.showPlaceholder(
    BITMAP_TEXT_PLACEHOLDER_WIDTH,
    BITMAP_TEXT_PLACEHOLDER_HEIGHT,
    BITMAP_FONT_UNASSIGNED_TINT,
  );
  return {
    visual: undefined,
    visualType: type,
    bounds: centeredBounds(
      BITMAP_TEXT_PLACEHOLDER_WIDTH,
      BITMAP_TEXT_PLACEHOLDER_HEIGHT,
    ),
  };
}

function missingResult(
  ctx: Parameters<PixiVisualPainter["paint"]>[0],
  type: string,
): VisualPaintResult {
  destroyVisual(ctx.visual);
  ctx.showPlaceholder(
    BITMAP_TEXT_PLACEHOLDER_WIDTH,
    BITMAP_TEXT_PLACEHOLDER_HEIGHT,
    PLACEHOLDER_MISSING_TINT,
  );
  return {
    visual: undefined,
    visualType: type,
    bounds: centeredBounds(
      BITMAP_TEXT_PLACEHOLDER_WIDTH,
      BITMAP_TEXT_PLACEHOLDER_HEIGHT,
    ),
  };
}

export const bitmapTextPainter: PixiVisualPainter = {
  type: "BitmapText",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as BitmapTextComponentData;
    let fontFamily = data.fontFamily;
    if (data.assetId) {
      const urls = ctx.assetResolver?.resolveBitmapFontUrls?.(data.assetId);
      if (!urls) {
        ctx.warnMissingAsset(data.assetId);
        return missingResult(ctx, data.type);
      }
      try {
        fontFamily = await loadBitmapFont(data.assetId, urls);
      } catch (error) {
        console.warn("[renderer] BitmapText font load failed", {
          category: "renderer",
          nodeId: ctx.node.id,
          assetId: data.assetId,
          error: error instanceof Error ? error.message : String(error),
        });
        ctx.warnMissingAsset(data.assetId);
        return missingResult(ctx, data.type);
      }
    }
    if (!fontFamily) {
      console.warn("[renderer] BitmapText has no font assigned", {
        category: "renderer",
        nodeId: ctx.node.id,
      });
      return unassignedResult(ctx, data.type);
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
            fontFamily,
            fontSize: data.fontSize,
            align: data.align,
            letterSpacing: data.letterSpacing,
          },
        });
        ensureChild(ctx.visualsRoot, view);
      } else {
        view.text = data.text;
        view.style.fontFamily = fontFamily;
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
        fontFamily,
        error: error instanceof Error ? error.message : String(error),
      });
      return missingResult(ctx, data.type);
    }
  },
};
