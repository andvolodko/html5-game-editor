import { Graphics } from "pixi.js";
import type { GraphicsComponentData } from "@game-editor/scene";
import type { PixiVisualPainter, VisualBounds, VisualPaintResult } from "../types.js";
import {
  boundsFromPoints,
  centeredBounds,
  destroyVisual,
  ensureChild,
} from "../paint-helpers.js";

function paintGraphicsShape(g: Graphics, data: GraphicsComponentData): void {
  g.clear();
  const shape = data.shape;
  switch (shape.type) {
    case "rectangle":
      g.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      break;
    case "rounded-rectangle":
      g.roundRect(
        -shape.width / 2,
        -shape.height / 2,
        shape.width,
        shape.height,
        shape.radius,
      );
      break;
    case "circle":
      g.circle(0, 0, shape.radius);
      break;
    case "ellipse":
      g.ellipse(0, 0, shape.width / 2, shape.height / 2);
      break;
    case "polygon": {
      const flat = shape.points.flatMap((p) => [p.x, p.y]);
      g.poly(flat);
      break;
    }
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
  if (data.fillAlpha > 0) {
    g.fill({ color: data.fillColor, alpha: data.fillAlpha });
  }
  if (data.strokeWidth > 0 && data.strokeAlpha > 0) {
    g.stroke({
      color: data.strokeColor,
      alpha: data.strokeAlpha,
      width: data.strokeWidth,
    });
  }
}

function graphicsBounds(data: GraphicsComponentData): VisualBounds {
  const shape = data.shape;
  switch (shape.type) {
    case "rectangle":
    case "rounded-rectangle":
    case "ellipse":
      return centeredBounds(shape.width, shape.height);
    case "circle":
      return centeredBounds(shape.radius * 2, shape.radius * 2);
    case "polygon":
      return boundsFromPoints(shape.points, 0);
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export const graphicsPainter: PixiVisualPainter = {
  type: "Graphics",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as GraphicsComponentData;
    ctx.hidePlaceholder();
    let view =
      ctx.visualType === "Graphics" && ctx.visual instanceof Graphics
        ? ctx.visual
        : undefined;
    if (!view) {
      destroyVisual(ctx.visual);
      view = new Graphics();
      ensureChild(ctx.visualsRoot, view);
    } else {
      ensureChild(ctx.visualsRoot, view);
    }
    try {
      paintGraphicsShape(view, data);
    } catch (error) {
      console.warn("[renderer] Graphics paint failed", {
        category: "renderer",
        nodeId: ctx.node.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: graphicsBounds(data),
    };
  },
};
