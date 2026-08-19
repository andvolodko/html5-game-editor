import type { Graphics } from "pixi.js";
import type { GraphicsShapeData, Vec2 } from "@game-editor/scene";

/** Trace a domain Graphics shape in node-local space (no fill/stroke). */
export function traceGraphicsShape(
  graphics: Graphics,
  shape: GraphicsShapeData,
  offset: Vec2,
): void {
  switch (shape.type) {
    case "rectangle":
      graphics.rect(
        offset.x - shape.width / 2,
        offset.y - shape.height / 2,
        shape.width,
        shape.height,
      );
      return;
    case "rounded-rectangle":
      graphics.roundRect(
        offset.x - shape.width / 2,
        offset.y - shape.height / 2,
        shape.width,
        shape.height,
        shape.radius,
      );
      return;
    case "circle":
      graphics.circle(offset.x, offset.y, shape.radius);
      return;
    case "ellipse":
      graphics.ellipse(offset.x, offset.y, shape.width / 2, shape.height / 2);
      return;
    case "polygon":
      graphics.poly(
        shape.points.flatMap((point) => [
          point.x + offset.x,
          point.y + offset.y,
        ]),
      );
      return;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}
