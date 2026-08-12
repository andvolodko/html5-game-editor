import { NineSliceSprite } from "pixi.js";
import type { NineSliceSpriteComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  centeredBounds,
  destroyVisual,
  ensureChild,
  missingTextureResult,
  resolveTexture,
} from "../paint-helpers.js";
import {
  EDITOR_CHROME_FILL,
  PLACEHOLDER_UNASSIGNED_TINT,
} from "../../editor-chrome.js";

export const nineSlicePainter: PixiVisualPainter = {
  type: "NineSliceSprite",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as NineSliceSpriteComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(ctx, data.type, data.width, data.height);
    }
    ctx.hidePlaceholder();
    let view =
      ctx.visualType === "NineSliceSprite" &&
      ctx.visual instanceof NineSliceSprite
        ? ctx.visual
        : undefined;
    if (!view) {
      destroyVisual(ctx.visual);
      view = new NineSliceSprite({
        texture: tex,
        width: data.width,
        height: data.height,
        leftWidth: data.leftWidth,
        rightWidth: data.rightWidth,
        topHeight: data.topHeight,
        bottomHeight: data.bottomHeight,
        anchor: 0.5,
      });
      ensureChild(ctx.visualsRoot, view);
    } else {
      view.texture = tex;
      view.width = data.width;
      view.height = data.height;
      view.leftWidth = data.leftWidth;
      view.rightWidth = data.rightWidth;
      view.topHeight = data.topHeight;
      view.bottomHeight = data.bottomHeight;
      ensureChild(ctx.visualsRoot, view);
    }
    // Match Sprite/TilingSprite: center on the node origin so selection
    // bounds (centeredBounds) line up with the painted mesh.
    view.anchor.set(0.5, 0.5);
    view.tint = data.tint ?? (data.assetId ? EDITOR_CHROME_FILL : PLACEHOLDER_UNASSIGNED_TINT);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: centeredBounds(data.width, data.height),
    };
  },
};
