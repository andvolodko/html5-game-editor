import { HTMLText } from "pixi.js";
import type { HTMLTextComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
  toTextStyleOptions,
} from "../paint-helpers.js";
import {
  PLACEHOLDER_UNASSIGNED_TINT,
  TEXT_FALLBACK_CHAR_WIDTH_EM,
  TEXT_FALLBACK_LINE_HEIGHT_EM,
} from "../../editor-chrome.js";

export const htmlTextPainter: PixiVisualPainter = {
  type: "HTMLText",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as HTMLTextComponentData;
    const fallback = {
      width:
        data.style.fontSize *
        Math.max(1, data.text.length * TEXT_FALLBACK_CHAR_WIDTH_EM),
      height: data.style.fontSize * TEXT_FALLBACK_LINE_HEIGHT_EM,
    };
    try {
      ctx.hidePlaceholder();
      let view =
        ctx.visualType === "HTMLText" && ctx.visual instanceof HTMLText
          ? ctx.visual
          : undefined;
      if (!view) {
        destroyVisual(ctx.visual);
        view = new HTMLText({
          text: data.text,
          style: toTextStyleOptions(data.style),
        });
        ensureChild(ctx.visualsRoot, view);
      } else {
        view.text = data.text;
        Object.assign(view.style, toTextStyleOptions(data.style));
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
      console.warn("[renderer] HTMLText paint failed", {
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
