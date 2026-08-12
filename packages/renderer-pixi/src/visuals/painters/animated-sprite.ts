import { AnimatedSprite } from "pixi.js";
import type { Texture } from "pixi.js";
import {
  DEFAULT_SPRITE_SIZE,
  type AnimatedSpriteComponentData,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  anchoredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
  missingTextureResult,
  resolveTexture,
  unassignedTextureResult,
} from "../paint-helpers.js";
import {
  EDITOR_CHROME_FILL,
  PLACEHOLDER_UNASSIGNED_TINT,
} from "../../editor-chrome.js";

export const animatedSpritePainter: PixiVisualPainter = {
  type: "AnimatedSprite",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as AnimatedSpriteComponentData;
    if (data.frames.length === 0) {
      return unassignedTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
        PLACEHOLDER_UNASSIGNED_TINT,
      );
    }
    const textures: Texture[] = [];
    for (const frameId of data.frames) {
      const { texture, missing } = await resolveTexture(ctx, frameId);
      if (!texture || missing) {
        return missingTextureResult(
          ctx,
          data.type,
          DEFAULT_SPRITE_SIZE,
          DEFAULT_SPRITE_SIZE,
        );
      }
      textures.push(texture);
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const view = new AnimatedSprite({
      textures,
      autoPlay: false,
    });
    view.animationSpeed = data.animationSpeed;
    view.loop = data.loop;
    view.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
    view.tint = data.tint ?? EDITOR_CHROME_FILL;
    if (data.width !== undefined) {
      view.width = data.width;
    }
    if (data.height !== undefined) {
      view.height = data.height;
    }
    if (data.playing) {
      view.play();
    } else {
      view.gotoAndStop(0);
    }
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    const w = data.width ?? DEFAULT_SPRITE_SIZE;
    const h = data.height ?? DEFAULT_SPRITE_SIZE;
    return {
      visual: view,
      visualType: data.type,
      bounds: localBoundsOf(view, anchoredBounds(w, h, data.anchor)),
    };
  },
};
