import {
  Circle,
  Ellipse,
  Polygon,
  Rectangle,
  RoundedRectangle,
  type Container,
} from "pixi.js";
import {
  getHitZoneOffset,
  type GraphicsShapeData,
  type HitZoneComponentData,
  type Vec2,
} from "@game-editor/scene";

export type PixiHitAreaShape =
  | Rectangle
  | Circle
  | Ellipse
  | Polygon
  | RoundedRectangle;

/** Pixi `hitArea` for a HitZone. Never assign this to the node container. */
export function pixiHitAreaFromHitZone(
  hitZone: HitZoneComponentData,
): PixiHitAreaShape {
  const offset = getHitZoneOffset(hitZone);
  return pixiHitAreaFromShape(hitZone.shape, offset);
}

export function pixiHitAreaFromShape(
  shape: GraphicsShapeData,
  offset: Vec2,
): PixiHitAreaShape {
  switch (shape.type) {
    case "rectangle":
      return new Rectangle(
        offset.x - shape.width / 2,
        offset.y - shape.height / 2,
        shape.width,
        shape.height,
      );
    case "rounded-rectangle":
      return new RoundedRectangle(
        offset.x - shape.width / 2,
        offset.y - shape.height / 2,
        shape.width,
        shape.height,
        shape.radius,
      );
    case "circle":
      return new Circle(offset.x, offset.y, shape.radius);
    case "ellipse":
      return new Ellipse(
        offset.x,
        offset.y,
        shape.width / 2,
        shape.height / 2,
      );
    case "polygon":
      return new Polygon(
        shape.points.flatMap((point) => [
          point.x + offset.x,
          point.y + offset.y,
        ]),
      );
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export function convertScreenToNodeLocal(
  container: Container,
  screen: Vec2,
): Vec2 {
  const local = container.worldTransform.applyInverse(screen);
  return { x: local.x, y: local.y };
}
