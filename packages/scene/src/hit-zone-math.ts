import type { GraphicsShapeData } from "./visual-components.js";
import type { HitZoneComponentData } from "./hit-zone-component.js";
import type { LocalAabb } from "./local-aabb.js";
import type { Vec2 } from "./types.js";
import type { VisualComponentData } from "./visual-components.js";
import {
  DEFAULT_GRAPHICS_CIRCLE_RADIUS,
  DEFAULT_GRAPHICS_ELLIPSE_HEIGHT,
  DEFAULT_GRAPHICS_ELLIPSE_WIDTH,
  DEFAULT_GRAPHICS_ROUNDED_RADIUS,
  DEFAULT_GRAPHICS_SIZE,
  DEFAULT_GRAPHICS_TRIANGLE_EXTENT,
} from "./defaults.js";
import { getVisualDisplaySize } from "./visual-components.js";
import {
  isCornerHandle,
  SPRITE_GIZMO_MIN_SIZE,
  type SpriteSizeHandle,
} from "./sprite-gizmo-math.js";

const HIT_ZONE_ORIGIN: Vec2 = { x: 0, y: 0 };

export function isHitZoneEnabled(hitZone: HitZoneComponentData): boolean {
  return hitZone.enabled !== false;
}

export function getHitZoneOffset(hitZone: HitZoneComponentData): Vec2 {
  return hitZone.offset ?? HIT_ZONE_ORIGIN;
}

/** Default Graphics/HitZone shape for a discriminant (Inspector type switch). */
export function defaultGraphicsShape(
  type: GraphicsShapeData["type"],
): GraphicsShapeData {
  switch (type) {
    case "rectangle":
      return {
        type,
        width: DEFAULT_GRAPHICS_SIZE,
        height: DEFAULT_GRAPHICS_SIZE,
      };
    case "rounded-rectangle":
      return {
        type,
        width: DEFAULT_GRAPHICS_SIZE,
        height: DEFAULT_GRAPHICS_SIZE,
        radius: DEFAULT_GRAPHICS_ROUNDED_RADIUS,
      };
    case "circle":
      return { type, radius: DEFAULT_GRAPHICS_CIRCLE_RADIUS };
    case "ellipse":
      return {
        type,
        width: DEFAULT_GRAPHICS_ELLIPSE_WIDTH,
        height: DEFAULT_GRAPHICS_ELLIPSE_HEIGHT,
      };
    case "polygon": {
      const extent = DEFAULT_GRAPHICS_TRIANGLE_EXTENT;
      return {
        type,
        points: [
          { x: 0, y: -extent },
          { x: extent, y: extent },
          { x: -extent, y: extent },
        ],
      };
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Shape copied from a visual when present; otherwise a default rectangle.
 * Offset stays at origin (centered sprites / Graphics).
 */
export function defaultHitZoneShapeFromVisual(
  visual: VisualComponentData | undefined,
): GraphicsShapeData {
  if (visual?.type === "Graphics") {
    return structuredClone(visual.shape);
  }
  const size = visual ? getVisualDisplaySize(visual) : undefined;
  if (size) {
    return { type: "rectangle", width: size.width, height: size.height };
  }
  return defaultGraphicsShape("rectangle");
}

/** Whether HitZone size handles apply (polygons are vertex-based). */
export function hitZoneSupportsSizeHandles(
  hitZone: HitZoneComponentData,
): boolean {
  return hitZone.shape.type !== "polygon";
}

export const HIT_ZONE_POLYGON_MIN_POINTS = 3;

export function isHitZonePolygon(
  shape: GraphicsShapeData,
): shape is Extract<GraphicsShapeData, { type: "polygon" }> {
  return shape.type === "polygon";
}

export function setHitZonePolygonPoint(
  shape: GraphicsShapeData,
  index: number,
  point: Vec2,
): GraphicsShapeData {
  if (!isHitZonePolygon(shape)) {
    return structuredClone(shape);
  }
  if (index < 0 || index >= shape.points.length) {
    return structuredClone(shape);
  }
  return {
    type: "polygon",
    points: shape.points.map((existing, i) =>
      i === index ? { x: point.x, y: point.y } : { ...existing },
    ),
  };
}

export function insertHitZonePolygonPointOnEdge(
  shape: GraphicsShapeData,
  edgeIndex: number,
  point?: Vec2,
): GraphicsShapeData {
  if (!isHitZonePolygon(shape) || shape.points.length === 0) {
    return structuredClone(shape);
  }
  const count = shape.points.length;
  const index = ((edgeIndex % count) + count) % count;
  const a = shape.points[index]!;
  const b = shape.points[(index + 1) % count]!;
  const inserted = point ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const next = shape.points.map((existing) => ({ ...existing }));
  next.splice(index + 1, 0, inserted);
  return { type: "polygon", points: next };
}

export function removeHitZonePolygonPoint(
  shape: GraphicsShapeData,
  index: number,
): GraphicsShapeData {
  if (
    !isHitZonePolygon(shape) ||
    shape.points.length <= HIT_ZONE_POLYGON_MIN_POINTS
  ) {
    return structuredClone(shape);
  }
  if (index < 0 || index >= shape.points.length) {
    return structuredClone(shape);
  }
  return {
    type: "polygon",
    points: shape.points.filter((_, i) => i !== index).map((p) => ({ ...p })),
  };
}

/** Width/height of a HitZone shape for gizmo layout (circle uses diameter). */
export function hitZoneShapeSize(
  shape: GraphicsShapeData,
): { width: number; height: number } | undefined {
  switch (shape.type) {
    case "rectangle":
    case "rounded-rectangle":
    case "ellipse":
      return { width: shape.width, height: shape.height };
    case "circle": {
      const diameter = shape.radius * 2;
      return { width: diameter, height: diameter };
    }
    case "polygon":
      return undefined;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

/** Resize a HitZone shape while keeping its discriminant. Circle stays circular. */
export function applySizeToHitZoneShape(
  shape: GraphicsShapeData,
  width: number,
  height: number,
): GraphicsShapeData {
  const nextWidth = Math.max(SPRITE_GIZMO_MIN_SIZE, width);
  const nextHeight = Math.max(SPRITE_GIZMO_MIN_SIZE, height);
  switch (shape.type) {
    case "rectangle":
      return { type: "rectangle", width: nextWidth, height: nextHeight };
    case "rounded-rectangle":
      return {
        type: "rounded-rectangle",
        width: nextWidth,
        height: nextHeight,
        radius: Math.min(shape.radius, nextWidth / 2, nextHeight / 2),
      };
    case "circle":
      return {
        type: "circle",
        radius: Math.max(nextWidth, nextHeight) / 2,
      };
    case "ellipse":
      return { type: "ellipse", width: nextWidth, height: nextHeight };
    case "polygon":
      return structuredClone(shape);
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

/**
 * Resize a HitZone from a size handle in node-local space (visualsRoot).
 * Keeps the opposite edge/corner fixed and updates offset so handles still
 * track the pointer when the node is rotated.
 */
export function hitZoneSizeFromHandleDrag(
  handle: SpriteSizeHandle,
  localX: number,
  localY: number,
  startOffset: Vec2,
  startWidth: number,
  startHeight: number,
  options?: { uniform?: boolean },
): { offset: Vec2; width: number; height: number } {
  const min = SPRITE_GIZMO_MIN_SIZE;
  const startLeft = startOffset.x - startWidth / 2;
  const startRight = startOffset.x + startWidth / 2;
  const startTop = startOffset.y - startHeight / 2;
  const startBottom = startOffset.y + startHeight / 2;

  if (options?.uniform === true && isCornerHandle(handle)) {
    return uniformHitZoneCornerDrag(
      handle,
      localX,
      localY,
      startLeft,
      startRight,
      startTop,
      startBottom,
      startWidth,
      startHeight,
      min,
    );
  }

  const moveLeft = handle === "w" || handle === "nw" || handle === "sw";
  const moveRight = handle === "e" || handle === "ne" || handle === "se";
  const moveTop = handle === "nw" || handle === "ne";
  const moveBottom = handle === "sw" || handle === "se";

  let left = moveLeft ? localX : startLeft;
  let right = moveRight ? localX : startRight;
  let top = moveTop ? localY : startTop;
  let bottom = moveBottom ? localY : startBottom;

  if (right - left < min) {
    if (moveLeft && !moveRight) {
      left = right - min;
    } else if (moveRight && !moveLeft) {
      right = left + min;
    } else {
      const mid = (left + right) / 2;
      left = mid - min / 2;
      right = mid + min / 2;
    }
  }
  if (bottom - top < min) {
    if (moveTop && !moveBottom) {
      top = bottom - min;
    } else if (moveBottom && !moveTop) {
      bottom = top + min;
    } else {
      const mid = (top + bottom) / 2;
      top = mid - min / 2;
      bottom = mid + min / 2;
    }
  }

  return {
    offset: { x: (left + right) / 2, y: (top + bottom) / 2 },
    width: right - left,
    height: bottom - top,
  };
}

function uniformHitZoneCornerDrag(
  handle: SpriteSizeHandle,
  localX: number,
  localY: number,
  startLeft: number,
  startRight: number,
  startTop: number,
  startBottom: number,
  startWidth: number,
  startHeight: number,
  min: number,
): { offset: Vec2; width: number; height: number } {
  let scaleX = 1;
  let scaleY = 1;
  switch (handle) {
    case "se":
      scaleX = startWidth > 0 ? (localX - startLeft) / startWidth : 1;
      scaleY = startHeight > 0 ? (localY - startTop) / startHeight : 1;
      break;
    case "ne":
      scaleX = startWidth > 0 ? (localX - startLeft) / startWidth : 1;
      scaleY = startHeight > 0 ? (startBottom - localY) / startHeight : 1;
      break;
    case "sw":
      scaleX = startWidth > 0 ? (startRight - localX) / startWidth : 1;
      scaleY = startHeight > 0 ? (localY - startTop) / startHeight : 1;
      break;
    case "nw":
      scaleX = startWidth > 0 ? (startRight - localX) / startWidth : 1;
      scaleY = startHeight > 0 ? (startBottom - localY) / startHeight : 1;
      break;
  }
  const minScale = min / Math.max(startWidth, startHeight, 1);
  const scale = Math.max(scaleX, scaleY, minScale);
  const width = startWidth * scale;
  const height = startHeight * scale;
  switch (handle) {
    case "se":
      return {
        offset: { x: startLeft + width / 2, y: startTop + height / 2 },
        width,
        height,
      };
    case "ne":
      return {
        offset: { x: startLeft + width / 2, y: startBottom - height / 2 },
        width,
        height,
      };
    case "sw":
      return {
        offset: { x: startRight - width / 2, y: startTop + height / 2 },
        width,
        height,
      };
    case "nw":
      return {
        offset: { x: startRight - width / 2, y: startBottom - height / 2 },
        width,
        height,
      };
    default:
      return {
        offset: {
          x: (startLeft + startRight) / 2,
          y: (startTop + startBottom) / 2,
        },
        width,
        height,
      };
  }
}

/** Axis-aligned bounds of the hit zone in node-local space. */
export function hitZoneLocalAabb(hitZone: HitZoneComponentData): LocalAabb {
  const offset = getHitZoneOffset(hitZone);
  const shape = hitZone.shape;
  switch (shape.type) {
    case "rectangle":
    case "rounded-rectangle":
    case "ellipse":
      return {
        x: offset.x - shape.width / 2,
        y: offset.y - shape.height / 2,
        width: shape.width,
        height: shape.height,
      };
    case "circle": {
      const diameter = shape.radius * 2;
      return {
        x: offset.x - shape.radius,
        y: offset.y - shape.radius,
        width: diameter,
        height: diameter,
      };
    }
    case "polygon":
      return polygonAabb(shape.points, offset);
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export function localPointHitsHitZone(
  hitZone: HitZoneComponentData,
  localPoint: Vec2,
): boolean {
  if (!isHitZoneEnabled(hitZone)) {
    return false;
  }
  const offset = getHitZoneOffset(hitZone);
  const x = localPoint.x - offset.x;
  const y = localPoint.y - offset.y;
  const shape = hitZone.shape;
  switch (shape.type) {
    case "rectangle":
      return pointInCenteredRect(x, y, shape.width, shape.height);
    case "rounded-rectangle":
      return pointInCenteredRoundedRect(
        x,
        y,
        shape.width,
        shape.height,
        shape.radius,
      );
    case "circle":
      return x * x + y * y <= shape.radius * shape.radius;
    case "ellipse":
      return pointInCenteredEllipse(x, y, shape.width, shape.height);
    case "polygon":
      return pointInPolygon(localPoint, shape.points, offset);
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

function pointInCenteredRect(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return Math.abs(x) <= width / 2 && Math.abs(y) <= height / 2;
}

function pointInCenteredEllipse(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const rx = width / 2;
  const ry = height / 2;
  if (rx <= 0 || ry <= 0) {
    return false;
  }
  const nx = x / rx;
  const ny = y / ry;
  return nx * nx + ny * ny <= 1;
}

function pointInCenteredRoundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): boolean {
  const halfW = width / 2;
  const halfH = height / 2;
  if (!pointInCenteredRect(x, y, width, height)) {
    return false;
  }
  const r = Math.min(radius, halfW, halfH);
  if (r <= 0) {
    return true;
  }
  const innerW = halfW - r;
  const innerH = halfH - r;
  if (Math.abs(x) <= innerW || Math.abs(y) <= innerH) {
    return true;
  }
  const cx = x < 0 ? -innerW : innerW;
  const cy = y < 0 ? -innerH : innerH;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function polygonAabb(points: readonly Vec2[], offset: Vec2): LocalAabb {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const x = point.x + offset.x;
    const y = point.y + offset.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) {
    return { x: offset.x, y: offset.y, width: 0, height: 0 };
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Even-odd ray cast in node-local space (`points` are relative to shape origin). */
function pointInPolygon(
  localPoint: Vec2,
  points: readonly Vec2[],
  offset: Vec2,
): boolean {
  const px = localPoint.x;
  const py = localPoint.y;
  let inside = false;
  const count = points.length;
  for (let i = 0, j = count - 1; i < count; j = i, i += 1) {
    const xi = points[i]!.x + offset.x;
    const yi = points[i]!.y + offset.y;
    const xj = points[j]!.x + offset.x;
    const yj = points[j]!.y + offset.y;
    const crosses =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}
