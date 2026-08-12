import type { Container } from "pixi.js";
import type { VisualComponentData } from "@game-editor/scene";
import type {
  PixiVisualPainter,
  VisualPaintContext,
  VisualPaintResult,
} from "./types.js";
import { destroyVisual } from "./paint-helpers.js";
import { spritePainter } from "./painters/sprite.js";
import { nineSlicePainter } from "./painters/nine-slice.js";
import { tilingPainter } from "./painters/tiling.js";
import { graphicsPainter } from "./painters/graphics.js";
import { textPainter } from "./painters/text.js";
import { bitmapTextPainter } from "./painters/bitmap-text.js";
import { htmlTextPainter } from "./painters/html-text.js";
import {
  meshPainter,
  meshPlanePainter,
  meshRopePainter,
  meshSimplePainter,
  perspectiveMeshPainter,
} from "./painters/mesh.js";
import { animatedSpritePainter } from "./painters/animated-sprite.js";
import { spinePainter } from "./painters/spine.js";

const painters: PixiVisualPainter[] = [
  spritePainter,
  nineSlicePainter,
  tilingPainter,
  graphicsPainter,
  textPainter,
  bitmapTextPainter,
  htmlTextPainter,
  meshPainter,
  meshSimplePainter,
  meshRopePainter,
  meshPlanePainter,
  perspectiveMeshPainter,
  animatedSpritePainter,
  spinePainter,
];

const painterByType = new Map<string, PixiVisualPainter>(
  painters.map((p) => [p.type, p]),
);

export function getVisualPainter(
  type: VisualComponentData["type"],
): PixiVisualPainter | undefined {
  return painterByType.get(type);
}

export async function paintVisualComponent(
  ctx: VisualPaintContext,
): Promise<VisualPaintResult> {
  const painter = getVisualPainter(ctx.data.type);
  if (!painter) {
    destroyVisual(ctx.visual);
    ctx.hidePlaceholder();
    console.warn("[renderer] no painter for visual type", {
      category: "renderer",
      type: ctx.data.type,
      nodeId: ctx.node.id,
    });
    return { visual: undefined, visualType: ctx.data.type };
  }
  return painter.paint(ctx);
}

export function clearVisual(visual: Container | undefined): void {
  destroyVisual(visual);
}
