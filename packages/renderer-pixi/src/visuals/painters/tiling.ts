import { TilingSprite } from "pixi.js";
import type { TilingSpriteComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  destroyVisual,
  ensureChild,
  missingTextureResult,
  resolveTexture,
} from "../paint-helpers.js";
import {
  EDITOR_CHROME_FILL,
  PLACEHOLDER_UNASSIGNED_TINT,
} from "../../editor-chrome.js";

export const tilingPainter: PixiVisualPainter = {
  type: "TilingSprite",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as TilingSpriteComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(ctx, data.type, data.width, data.height);
    }
    ctx.hidePlaceholder();
    let view =
      ctx.visualType === "TilingSprite" && ctx.visual instanceof TilingSprite
        ? ctx.visual
        : undefined;
    if (!view) {
      destroyVisual(ctx.visual);
      view = new TilingSprite({
        texture: tex,
        width: data.width,
        height: data.height,
      });
      ensureChild(ctx.visualsRoot, view);
    } else {
      view.texture = tex;
      view.width = data.width;
      view.height = data.height;
      ensureChild(ctx.visualsRoot, view);
    }
    view.tilePosition.set(data.tilePosition.x, data.tilePosition.y);
    view.tileScale.set(data.tileScale.x, data.tileScale.y);
    view.tileRotation = data.tileRotation;
    view.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
    view.tint = data.tint ?? (data.assetId ? EDITOR_CHROME_FILL : PLACEHOLDER_UNASSIGNED_TINT);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: anchoredBounds(data.width, data.height, data.anchor),
    };
  },
};
