import { Container, Graphics, Sprite, Texture } from "pixi.js";
import {
  getMaskOffset,
  isMaskInverse,
  maskAsHitZone,
  type MaskComponentData,
} from "@game-editor/scene";
import {
  MASK_FILL_ALPHA,
  MASK_FILL_COLOR,
  MASK_STROKE_ALPHA,
  MASK_STROKE_COLOR,
  MASK_STROKE_WIDTH,
} from "./editor-chrome.js";
import { paintHitZoneOverlay } from "./pixi-hit-zone-overlay.js";
import { pixiHitAreaFromHitZone } from "./pixi-hit-zone-hit-area.js";
import { traceGraphicsShape } from "./pixi-graphics-shape.js";
import { effectiveMask } from "./pixi-mask-pick.js";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

const STENCIL_LABEL = "maskStencil";

export interface MaskTextureLoader {
  loadTexture: (assetId: string, url: string) => Promise<Texture>;
  resolveUrl: (assetId: string) => string | undefined;
  warnMissingAsset: (assetId: string) => void;
}

/**
 * Apply the clip stencil and editor overlay. Never masks chromeRoot.
 */
export async function syncMaskDisplay(
  runtime: RuntimeNode,
  options: {
    selected: boolean;
    strokeScale: number;
    textures?: MaskTextureLoader;
  },
): Promise<void> {
  const mask = effectiveMask(runtime);
  if (!mask) {
    clearMask(runtime);
    paintEditorOverlay(runtime, undefined, options.strokeScale);
    return;
  }
  const applied = await applyStencil(runtime, mask, options.textures);
  if (!applied) {
    clearMask(runtime);
  }
  paintEditorOverlay(
    runtime,
    options.selected ? mask : undefined,
    options.strokeScale,
  );
}

function paintEditorOverlay(
  runtime: RuntimeNode,
  mask: MaskComponentData | undefined,
  strokeScale: number,
): void {
  const overlay = runtime.maskOverlay;
  if (!overlay) {
    return;
  }
  const asHitZone = mask ? maskAsHitZone(mask) : undefined;
  paintHitZoneOverlay(overlay, asHitZone, strokeScale, {
    fill: MASK_FILL_COLOR,
    stroke: MASK_STROKE_COLOR,
    fillAlpha: MASK_FILL_ALPHA,
    strokeAlpha: MASK_STROKE_ALPHA,
    strokeWidth: MASK_STROKE_WIDTH,
  });
  const interactive =
    asHitZone !== undefined && runtime.editable && !runtime.editorLocked;
  overlay.eventMode = interactive ? "static" : "none";
  overlay.cursor = "move";
  overlay.hitArea = interactive ? pixiHitAreaFromHitZone(asHitZone) : undefined;
}

async function applyStencil(
  runtime: RuntimeNode,
  mask: MaskComponentData,
  textures: MaskTextureLoader | undefined,
): Promise<boolean> {
  if (mask.mode === "sprite") {
    return applySpriteStencil(runtime, mask, textures);
  }
  const shape = maskAsHitZone(mask);
  if (!shape) {
    return false;
  }
  const graphics = ensureGraphicsStencil(runtime);
  graphics.clear();
  traceGraphicsShape(graphics, shape.shape, getMaskOffset(mask));
  graphics.fill({ color: 0xffffff });
  applyClip(runtime.contentRoot, graphics, {
    inverse: isMaskInverse(mask),
    alphaChannel: false,
  });
  return true;
}

async function applySpriteStencil(
  runtime: RuntimeNode,
  mask: MaskComponentData,
  textures: MaskTextureLoader | undefined,
): Promise<boolean> {
  if (!mask.assetId || !textures) {
    return false;
  }
  const url = textures.resolveUrl(mask.assetId);
  if (!url) {
    textures.warnMissingAsset(mask.assetId);
    return false;
  }
  let texture: Texture;
  try {
    texture = await textures.loadTexture(mask.assetId, url);
  } catch {
    textures.warnMissingAsset(mask.assetId);
    return false;
  }
  if (runtime.warnedMissingMaskAsset) {
    runtime.warnedMissingMaskAsset = false;
  }
  const sprite = ensureSpriteStencil(runtime);
  sprite.texture = texture;
  sprite.anchor.set(0.5);
  const offset = getMaskOffset(mask);
  sprite.position.set(offset.x, offset.y);
  const width = mask.width ?? texture.width;
  const height = mask.height ?? texture.height;
  if (width > 0 && height > 0) {
    sprite.width = width;
    sprite.height = height;
  }
  applyClip(runtime.contentRoot, sprite, {
    inverse: isMaskInverse(mask),
    alphaChannel: true,
  });
  return true;
}

function ensureGraphicsStencil(runtime: RuntimeNode): Graphics {
  if (runtime.maskStencil instanceof Graphics && !runtime.maskStencil.destroyed) {
    return runtime.maskStencil;
  }
  destroyStencilObject(runtime);
  const graphics = new Graphics();
  configureStencil(graphics);
  runtime.contentRoot.addChild(graphics);
  runtime.maskStencil = graphics;
  return graphics;
}

function ensureSpriteStencil(runtime: RuntimeNode): Sprite {
  if (runtime.maskStencil instanceof Sprite && !runtime.maskStencil.destroyed) {
    return runtime.maskStencil;
  }
  destroyStencilObject(runtime);
  const sprite = new Sprite();
  configureStencil(sprite);
  runtime.contentRoot.addChild(sprite);
  runtime.maskStencil = sprite;
  return sprite;
}

function configureStencil(stencil: Container): void {
  stencil.eventMode = "none";
  stencil.label = STENCIL_LABEL;
  // Keep renderable. Pixi stencil collection skips globalDisplayStatus < 7
  // (renderable bit). StencilMask already sets includeInBuild=false so this
  // object is not drawn as a regular visual.
}

function clearMask(runtime: RuntimeNode): void {
  applyClip(runtime.contentRoot, undefined, {
    inverse: false,
    alphaChannel: false,
  });
  destroyStencilObject(runtime);
}

function destroyStencilObject(runtime: RuntimeNode): void {
  const stencil = runtime.maskStencil;
  if (!stencil) {
    return;
  }
  stencil.removeFromParent();
  stencil.destroy();
  runtime.maskStencil = undefined;
}

type MaskHost = Container & {
  setMask?: (options: {
    mask: Container | null;
    inverse?: boolean;
    channel?: "red" | "alpha";
  }) => void;
};

function applyClip(
  target: Container,
  stencil: Container | undefined,
  options: { inverse: boolean; alphaChannel: boolean },
): void {
  const host = target as MaskHost;
  // setMask({ mask: null }) does not clear the effect — only `.mask = null` does.
  target.mask = null;
  if (!stencil) {
    host.setMask?.({ inverse: false, channel: "red" });
    return;
  }
  if (typeof host.setMask === "function") {
    host.setMask({
      mask: stencil,
      inverse: options.inverse,
      channel: options.alphaChannel ? "alpha" : "red",
    });
    return;
  }
  target.mask = stencil;
}
