import {
  type ParticleEmitterComponentData,
  particleSpawnLocalBounds,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  destroyVisual,
  ensureChild,
  resolveTexture,
} from "../paint-helpers.js";
import {
  PLACEHOLDER_MISSING_TINT,
} from "../../editor-chrome.js";
import {
  ParticleEmitterView,
  isParticleEmitterView,
} from "../particle-emitter-view.js";
import { defaultParticleCircleTexture } from "../default-particle-texture.js";

const MISSING_TEXTURE_PLACEHOLDER_SIZE = 32;

export const particleEmitterPainter: PixiVisualPainter = {
  type: "ParticleEmitter",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as ParticleEmitterComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (missing && data.assetId ? undefined : defaultParticleCircleTexture());

    if (!tex) {
      destroyVisual(ctx.visual, ctx.visualsRoot);
      ctx.showPlaceholder(
        MISSING_TEXTURE_PLACEHOLDER_SIZE,
        MISSING_TEXTURE_PLACEHOLDER_SIZE,
        PLACEHOLDER_MISSING_TINT,
      );
      return {
        visual: undefined,
        visualType: data.type,
        bounds: {
          x: -MISSING_TEXTURE_PLACEHOLDER_SIZE / 2,
          y: -MISSING_TEXTURE_PLACEHOLDER_SIZE / 2,
          width: MISSING_TEXTURE_PLACEHOLDER_SIZE,
          height: MISSING_TEXTURE_PLACEHOLDER_SIZE,
        },
      };
    }

    ctx.hidePlaceholder();

    let view =
      ctx.visualType === "ParticleEmitter" && isParticleEmitterView(ctx.visual)
        ? ctx.visual
        : undefined;

    if (!view) {
      destroyVisual(ctx.visual, ctx.visualsRoot);
      view = new ParticleEmitterView(data, tex);
      ensureChild(ctx.visualsRoot, view);
    } else {
      view.setTexture(tex);
      view.setConfig(data);
      ensureChild(ctx.visualsRoot, view);
    }

    view.visible = true;
    const bounds = particleSpawnLocalBounds(data);
    return {
      visual: view,
      visualType: data.type,
      bounds,
      supportsSpriteGizmo: false,
    };
  },
};
