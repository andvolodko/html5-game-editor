import {
  DEFAULT_SPRITE_SIZE,
  type SpineComponentData,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
  missingTextureResult,
  unassignedTextureResult,
} from "../paint-helpers.js";
import { PLACEHOLDER_UNASSIGNED_TINT } from "../../editor-chrome.js";
import { applySpinePlayback, loadSpine } from "../../load-spine.js";

export const spinePainter: PixiVisualPainter = {
  type: "Spine",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as SpineComponentData;
    if (!data.assetId) {
      return unassignedTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
        PLACEHOLDER_UNASSIGNED_TINT,
      );
    }
    const urls = ctx.assetResolver?.resolveSpineUrls?.(data.assetId);
    if (!urls) {
      ctx.warnMissingAsset(data.assetId);
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
      );
    }

    try {
      const view = await loadSpine(urls);
      applySpinePlayback(view, { ...data, hostDriven: true });
      ctx.hidePlaceholder();
      destroyVisual(ctx.visual);
      ensureChild(ctx.visualsRoot, view);
      view.visible = true;
      return {
        visual: view,
        visualType: data.type,
        bounds: localBoundsOf(
          view,
          centeredBounds(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE),
        ),
      };
    } catch (error) {
      console.warn("[renderer] spine load failed", {
        category: "renderer",
        assetId: data.assetId,
        nodeId: ctx.node.id,
        error: error instanceof Error ? error.message : String(error),
      });
      ctx.warnMissingAsset(data.assetId);
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
      );
    }
  },
};
