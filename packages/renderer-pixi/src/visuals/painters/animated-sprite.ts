import { AnimatedSprite } from "pixi.js";
import type { Container, Texture } from "pixi.js";
import {
  DEFAULT_SPRITE_SIZE,
  type AnimatedSpriteComponentData,
} from "@game-editor/scene";
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

export const animatedSpritePainter: PixiVisualPainter = {
  type: "AnimatedSprite",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as AnimatedSpriteComponentData;
    const aseprite = data.assetId
      ? ctx.assetResolver?.resolveAsepriteUrls?.(data.assetId)
      : undefined;
    if (aseprite) {
      try {
        const sheet = await loadPixiSpritesheet(aseprite.jsonUrl);
        const textures = spritesheetTextures(sheet, data.animation);
        if (textures.length === 0) {
          return missingTextureResult(
            ctx,
            data.type,
            data.width ?? DEFAULT_SPRITE_SIZE,
            data.height ?? DEFAULT_SPRITE_SIZE,
          );
        }
        return paintAnimated(ctx, data, textures);
      } catch {
        return missingTextureResult(
          ctx,
          data.type,
          data.width ?? DEFAULT_SPRITE_SIZE,
          data.height ?? DEFAULT_SPRITE_SIZE,
        );
      }
    }
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
    return paintAnimated(ctx, data, textures);
  },
};

function liveAnimatedSprite(visual: Container | undefined): AnimatedSprite | undefined {
  return visual instanceof AnimatedSprite && !visual.destroyed
    ? visual
    : undefined;
}

function paintAnimated(
  ctx: Parameters<PixiVisualPainter["paint"]>[0],
  data: AnimatedSpriteComponentData,
  textures: Texture[],
): VisualPaintResult {
  ctx.hidePlaceholder();
  const existing = liveAnimatedSprite(ctx.visual);
  const view =
    existing ??
    new AnimatedSprite({
      textures,
      autoPlay: false,
      autoUpdate: false,
    });
  if (!existing) {
    destroyVisual(ctx.visual, ctx.visualsRoot);
  } else {
    view.textures = textures;
  }
  view.animationSpeed = data.animationSpeed;
  view.loop = data.loop;
  view.anchor.set(data.anchor?.x ?? 0.5, data.anchor?.y ?? 0.5);
  view.tint = data.tint ?? EDITOR_CHROME_FILL;
  const nativeW = Math.max(1, textures[0]?.width ?? DEFAULT_SPRITE_SIZE);
  const nativeH = Math.max(1, textures[0]?.height ?? DEFAULT_SPRITE_SIZE);
  const w = data.width ?? nativeW;
  const h = data.height ?? nativeH;
  view.width = w;
  view.height = h;
  if (data.playing) {
    view.gotoAndPlay(0);
  } else {
    view.gotoAndStop(0);
  }
  ensureChild(ctx.visualsRoot, view);
  view.visible = true;
  return {
    visual: view,
    visualType: data.type,
    bounds: anchoredBounds(w, h, data.anchor),
    supportsSpriteGizmo: true,
  };
}
