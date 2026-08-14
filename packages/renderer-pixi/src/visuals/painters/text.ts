import { Text } from "pixi.js";
import type { TextComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
} from "../paint-helpers.js";
import { toTextStyleOptions, assignPixiTextStyle } from "../to-text-style-options.js";
import { resolveTextStyleWithWebFont } from "../resolve-text-style-webfont.js";
import {
  PLACEHOLDER_UNASSIGNED_TINT,
  TEXT_FALLBACK_CHAR_WIDTH_EM,
  TEXT_FALLBACK_LINE_HEIGHT_EM,
} from "../../editor-chrome.js";

export const textPainter: PixiVisualPainter = {
  type: "Text",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as TextComponentData;
    const fallback = {
      width:
        data.style.fontSize *
        Math.max(1, data.text.length * TEXT_FALLBACK_CHAR_WIDTH_EM),
      height: data.style.fontSize * TEXT_FALLBACK_LINE_HEIGHT_EM,
    };
    try {
      ctx.hidePlaceholder();
      const style = await resolveTextStyleWithWebFont(
        data.style,
        ctx.assetResolver,
        ctx.warnMissingAsset,
      );
      let view =
        ctx.visualType === "Text" && ctx.visual instanceof Text
          ? ctx.visual
          : undefined;
      if (!view) {
        destroyVisual(ctx.visual);
        view = new Text({
          text: data.text,
          style: toTextStyleOptions(style),
        });
        ensureChild(ctx.visualsRoot, view);
      } else {
        view.text = data.text;
        assignPixiTextStyle(view.style, style);
        ensureChild(ctx.visualsRoot, view);
      }
      view.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
      view.visible = true;
      return {
        visual: view,
        visualType: data.type,
        bounds: localBoundsOf(
          view,
          anchoredBounds(fallback.width, fallback.height, data.anchor),
        ),
      };
    } catch (error) {
      console.warn("[renderer] Text paint failed", {
        category: "renderer",
        nodeId: ctx.node.id,
        error: error instanceof Error ? error.message : String(error),
      });
      destroyVisual(ctx.visual);
      ctx.showPlaceholder(
        fallback.width,
        fallback.height,
        PLACEHOLDER_UNASSIGNED_TINT,
      );
      return {
        visual: undefined,
        visualType: data.type,
        bounds: centeredBounds(fallback.width, fallback.height),
      };
    }
  },
};
