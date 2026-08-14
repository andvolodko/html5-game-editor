import { Sprite } from "pixi.js";
import type { SpriteComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  destroyVisual,
  ensureChild,
  missingTextureResult,
  resolveTexture,
  unassignedTextureResult,
} from "../paint-helpers.js";
import {
  EDITOR_CHROME_FILL,
  PLACEHOLDER_UNASSIGNED_TINT,
} from "../../editor-chrome.js";
import {
  loadPixiSpritesheet,
  spritesheetTextures,
} from "../../load-pixi-spritesheet.js";

export const spritePainter: PixiVisualPainter = {
  type: "Sprite",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as SpriteComponentData;
    const aseprite = data.assetId
      ? ctx.assetResolver?.resolveAsepriteUrls?.(data.assetId)
      : undefined;
    if (aseprite) {
      try {
        const sheet = await loadPixiSpritesheet(aseprite.jsonUrl);
        const textures = spritesheetTextures(sheet, undefined);
        const texture = textures[0];
        if (!texture) {
          return missingTextureResult(ctx, data.type, data.width, data.height, true);
        }
        ctx.hidePlaceholder();
        let sprite =
          ctx.visualType === "Sprite" && ctx.visual instanceof Sprite
            ? ctx.visual
            : undefined;
        if (!sprite) {
          destroyVisual(ctx.visual);
          sprite = new Sprite(texture);
          ensureChild(ctx.visualsRoot, sprite);
        } else {
          sprite.texture = texture;
          ensureChild(ctx.visualsRoot, sprite);
        }
        sprite.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
        sprite.width = data.width;
        sprite.height = data.height;
        sprite.tint = data.tint ?? EDITOR_CHROME_FILL;
        sprite.visible = true;
        return {
          visual: sprite,
          visualType: data.type,
          bounds: anchoredBounds(data.width, data.height, data.anchor),
          supportsSpriteGizmo: true,
        };
      } catch {
        return missingTextureResult(ctx, data.type, data.width, data.height, true);
      }
    }
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    if (!data.assetId) {
      return unassignedTextureResult(
        ctx,
        data.type,
        data.width,
        data.height,
        data.tint ?? PLACEHOLDER_UNASSIGNED_TINT,
        true,
      );
    }
    if (!texture || missing) {
      return missingTextureResult(ctx, data.type, data.width, data.height, true);
    }
    ctx.hidePlaceholder();
    let sprite =
      ctx.visualType === "Sprite" && ctx.visual instanceof Sprite
        ? ctx.visual
        : undefined;
    if (!sprite) {
      destroyVisual(ctx.visual);
      sprite = new Sprite(texture);
      ensureChild(ctx.visualsRoot, sprite);
    } else {
      sprite.texture = texture;
      ensureChild(ctx.visualsRoot, sprite);
    }
    sprite.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
    sprite.width = data.width;
    sprite.height = data.height;
    sprite.tint = data.tint ?? EDITOR_CHROME_FILL;
    sprite.visible = true;
    return {
      visual: sprite,
      visualType: data.type,
      bounds: anchoredBounds(data.width, data.height, data.anchor),
      supportsSpriteGizmo: true,
    };
  },
};
