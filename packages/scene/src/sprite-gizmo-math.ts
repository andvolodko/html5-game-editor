/**
 * Pure math for the sprite selection gizmo (testable, renderer-agnostic).
 *
 * Six size handles: four corners + left/right midpoints.
 * Scale arrows (X/Y) when the visual has no editable width/height.
 * Rotation is a separate stem handle above the top edge.
 * Anchor is a draggable pivot inside the bounds (0–1 UV).
 * Flip H/V are click tools below the bottom edge.
 */

import type { Vec2 } from "./types.js";

export const SPRITE_GIZMO_MIN_SIZE = 8;

/** Minimum |scale| magnitude when dragging scale arrows. */
export const SPRITE_GIZMO_MIN_SCALE = 0.05;

/** Distance from top edge to the rotate handle center. */
export const SPRITE_GIZMO_ROTATE_OFFSET = 28;

/** Distance from bottom edge to flip tool centers. */
export const SPRITE_GIZMO_FLIP_OFFSET = 24;

/** Horizontal gap between flip tool centers. */
export const SPRITE_GIZMO_FLIP_GAP = 28;

/** Inset from the left edge for flip tool centers. */
export const SPRITE_GIZMO_FLIP_INSET = 10;

/**
 * How far size-handle hit tests extend past the handle center.
 * Must match the invisible hit pad in SpriteSelectionGizmo.
 * ~28×28px target — small visual box, comfortable click/grab area.
 */
export const SPRITE_GIZMO_HANDLE_HIT_EXTENT = 14;

/**
 * How far the rotate-handle hit test extends from its center
 * (visual radius + pad in SpriteSelectionGizmo).
 */
export const SPRITE_GIZMO_ROTATE_HIT_EXTENT = 14;

/** Hit radius for the in-bounds anchor pivot. */
export const SPRITE_GIZMO_ANCHOR_HIT_EXTENT = 12;

/**
 * Extra hit padding around the sprite so Pixi does not prune gizmo
 * handles that sit outside the display rect. Pixi's EventBoundary
 * skips an entire subtree when the pointer is outside `hitArea`.
 * Apply this on the visuals root only — never on the node container —
 * or child sprites outside the parent rect become unselectable.
 *
 * `cameraScale` is the editor preview camera. `nodeScale` is the node's
 * local-to-world scale (including ancestors, excluding camera). Chrome
 * offsets stay screen-constant, so world-space outsets grow as the view
 * zooms out or the node is scaled down.
 */
export function spriteGizmoHitOutsets(
  cameraScale = 1,
  nodeScale: Vec2 = { x: 1, y: 1 },
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const invX = chromeInvScale(cameraScale * nodeScale.x);
  const invY = chromeInvScale(cameraScale * nodeScale.y);
  return {
    left: SPRITE_GIZMO_HANDLE_HIT_EXTENT * invX,
    right: SPRITE_GIZMO_HANDLE_HIT_EXTENT * invX,
    bottom: (SPRITE_GIZMO_FLIP_OFFSET + SPRITE_GIZMO_HANDLE_HIT_EXTENT) * invY,
    top: (SPRITE_GIZMO_ROTATE_OFFSET + SPRITE_GIZMO_ROTATE_HIT_EXTENT) * invY,
  };
}

function chromeInvScale(scale: number): number {
  if (!Number.isFinite(scale) || Math.abs(scale) < 1e-9) {
    return 1;
  }
  return 1 / Math.abs(scale);
}

export type SpriteSizeHandle = "nw" | "ne" | "sw" | "se" | "w" | "e";

/** Axis scale arrows when the visual has no editable width/height. */
export type SpriteScaleHandle = "scaleX" | "scaleY";

export type SpriteGizmoHandle =
  | SpriteSizeHandle
  | SpriteScaleHandle
  | "rotate"
  | "anchor"
  | "flipH"
  | "flipV";

export function isSpriteSizeHandle(
  handle: SpriteGizmoHandle,
): handle is SpriteSizeHandle {
  return (SPRITE_SIZE_HANDLES as readonly string[]).includes(handle);
}

export function isSpriteScaleHandle(
  handle: SpriteGizmoHandle,
): handle is SpriteScaleHandle {
  return (SPRITE_SCALE_HANDLES as readonly string[]).includes(handle);
}

export function isSpriteFlipHandle(
  handle: SpriteGizmoHandle,
): handle is "flipH" | "flipV" {
  return handle === "flipH" || handle === "flipV";
}

export function sizeHandleCursor(handle: SpriteSizeHandle): string {
  switch (handle) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "w":
    case "e":
      return "ew-resize";
  }
}

export function scaleHandleCursor(handle: SpriteScaleHandle): string {
  return handle === "scaleX" ? "ew-resize" : "ns-resize";
}

/**
 * Scale Transform2D from an axis arrow using parent-space axis distances
 * (avoids feedback when live container.scale changes during the drag).
 * Preserves flip sign. Shift = uniform.
 */
export function scaleFromAxisDrag(
  handle: SpriteScaleHandle,
  currentAxis: number,
  startAxis: number,
  startScale: Vec2,
  options?: { uniform?: boolean },
): Vec2 {
  if (Math.abs(startAxis) < Number.EPSILON) {
    return { x: startScale.x, y: startScale.y };
  }
  const ratio = currentAxis / startAxis;
  const applyUniform = options?.uniform === true;

  const nextX =
    applyUniform || handle === "scaleX"
      ? clampScaleAxis(startScale.x, ratio)
      : startScale.x;
  const nextY =
    applyUniform || handle === "scaleY"
      ? clampScaleAxis(startScale.y, ratio)
      : startScale.y;

  return { x: nextX, y: nextY };
}

function clampScaleAxis(start: number, ratio: number): number {
  const sign = start < 0 ? -1 : 1;
  const base = Math.abs(start) > Number.EPSILON ? Math.abs(start) : 1;
  const magnitude = Math.max(SPRITE_GIZMO_MIN_SCALE, Math.abs(base * ratio));
  return sign * magnitude;
}

/**
 * Resize from a handle using node-local pointer coords whose origin is the
 * sprite anchor (Pixi pivot). Keeps the anchor fixed — same as changing
 * Sprite.width/height — so non-center anchors do not drift the chrome.
 */
export function sizeFromHandleDrag(
  handle: SpriteSizeHandle,
  localX: number,
  localY: number,
  startWidth: number,
  startHeight: number,
  options?: { uniform?: boolean; anchor?: Vec2 },
): { width: number; height: number } {
  const min = SPRITE_GIZMO_MIN_SIZE;
  const anchor = options?.anchor ?? { x: 0.5, y: 0.5 };
  const uniform = options?.uniform === true && isCornerHandle(handle);

  if (uniform) {
    const scale = uniformScaleFromAnchorHandle(
      handle,
      localX,
      localY,
      startWidth,
      startHeight,
      anchor,
      min,
    );
    return {
      width: Math.max(min, startWidth * scale),
      height: Math.max(min, startHeight * scale),
    };
  }

  let width = startWidth;
  let height = startHeight;

  switch (handle) {
    case "e":
      width = widthFromRightEdge(localX, anchor.x, min);
      break;
    case "w":
      width = widthFromLeftEdge(localX, anchor.x, min);
      break;
    case "ne":
      width = widthFromRightEdge(localX, anchor.x, min);
      height = heightFromTopEdge(localY, anchor.y, min);
      break;
    case "se":
      width = widthFromRightEdge(localX, anchor.x, min);
      height = heightFromBottomEdge(localY, anchor.y, min);
      break;
    case "nw":
      width = widthFromLeftEdge(localX, anchor.x, min);
      height = heightFromTopEdge(localY, anchor.y, min);
      break;
    case "sw":
      width = widthFromLeftEdge(localX, anchor.x, min);
      height = heightFromBottomEdge(localY, anchor.y, min);
      break;
  }

  return { width, height };
}

function widthFromRightEdge(localX: number, anchorX: number, min: number): number {
  const denom = 1 - anchorX;
  if (!(denom > 1e-9)) {
    return min;
  }
  return Math.max(min, localX / denom);
}

function widthFromLeftEdge(localX: number, anchorX: number, min: number): number {
  if (!(anchorX > 1e-9)) {
    return min;
  }
  return Math.max(min, -localX / anchorX);
}

function heightFromBottomEdge(
  localY: number,
  anchorY: number,
  min: number,
): number {
  const denom = 1 - anchorY;
  if (!(denom > 1e-9)) {
    return min;
  }
  return Math.max(min, localY / denom);
}

function heightFromTopEdge(localY: number, anchorY: number, min: number): number {
  if (!(anchorY > 1e-9)) {
    return min;
  }
  return Math.max(min, -localY / anchorY);
}

function uniformScaleFromAnchorHandle(
  handle: SpriteSizeHandle,
  localX: number,
  localY: number,
  startWidth: number,
  startHeight: number,
  anchor: Vec2,
  min: number,
): number {
  const startRight = (1 - anchor.x) * startWidth;
  const startLeft = anchor.x * startWidth;
  const startBottom = (1 - anchor.y) * startHeight;
  const startTop = anchor.y * startHeight;
  const minScale = min / Math.max(startWidth, startHeight, 1);

  let scaleX = 1;
  let scaleY = 1;
  switch (handle) {
    case "e":
    case "ne":
    case "se":
      scaleX = startRight > 1e-9 ? localX / startRight : 1;
      break;
    case "w":
    case "nw":
    case "sw":
      scaleX = startLeft > 1e-9 ? -localX / startLeft : 1;
      break;
  }
  switch (handle) {
    case "ne":
    case "nw":
      scaleY = startTop > 1e-9 ? -localY / startTop : 1;
      break;
    case "se":
    case "sw":
      scaleY = startBottom > 1e-9 ? localY / startBottom : 1;
      break;
  }
  if (isCornerHandle(handle)) {
    return Math.max(scaleX, scaleY, minScale);
  }
  return Math.max(scaleX, minScale);
}

export function isCornerHandle(handle: SpriteSizeHandle): boolean {
  return handle === "nw" || handle === "ne" || handle === "sw" || handle === "se";
}

/**
 * Rotation from pointer motion around the sprite center (local space).
 * Returns degrees in roughly (-180, 180].
 */
export function rotationFromHandleDrag(
  localX: number,
  localY: number,
  startLocalX: number,
  startLocalY: number,
  startRotationDeg: number,
): number {
  const start = Math.atan2(startLocalY, startLocalX);
  const current = Math.atan2(localY, localX);
  const deltaDeg = ((current - start) * 180) / Math.PI;
  return normalizeRotationDegrees(startRotationDeg + deltaDeg);
}

export function normalizeRotationDegrees(degrees: number): number {
  let value = degrees % 360;
  if (value > 180) {
    value -= 360;
  }
  if (value <= -180) {
    value += 360;
  }
  return value;
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

/**
 * Visual center in node-local space for a display sized around a 0–1 anchor.
 * Sprite gizmo chrome is centered here (not at the transform origin).
 */
export function visualCenterFromAnchor(
  anchor: Vec2,
  width: number,
  height: number,
): Vec2 {
  return {
    x: (0.5 - anchor.x) * width,
    y: (0.5 - anchor.y) * height,
  };
}

/** Gizmo-local position of the anchor pivot (center origin). */
export function gizmoLocalFromAnchor(
  anchor: Vec2,
  width: number,
  height: number,
): Vec2 {
  return {
    x: (anchor.x - 0.5) * width,
    y: (anchor.y - 0.5) * height,
  };
}

/** Convert gizmo-local pointer to clamped 0–1 anchor. */
export function anchorFromGizmoLocal(
  localX: number,
  localY: number,
  width: number,
  height: number,
): Vec2 {
  return {
    x: clamp01(localX / Math.max(width, 1) + 0.5),
    y: clamp01(localY / Math.max(height, 1) + 0.5),
  };
}

/**
 * Parent-space position delta that keeps the visual fixed when the texture
 * anchor changes (Pixi scale-then-rotate local transform).
 */
export function positionDeltaForAnchorChange(
  from: Vec2,
  to: Vec2,
  width: number,
  height: number,
  rotationDeg: number,
  scale: Vec2,
): Vec2 {
  const dx = (to.x - from.x) * width;
  const dy = (to.y - from.y) * height;
  const rad = (rotationDeg * Math.PI) / 180;
  const lx = dx * scale.x;
  const ly = dy * scale.y;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return {
    x: lx * c - ly * s,
    y: lx * s + ly * c,
  };
}

/** Local-space handle position for a given display size (center origin). */
export function gizmoHandleLocalPosition(
  handle: SpriteGizmoHandle,
  width: number,
  height: number,
  rotateOffset = SPRITE_GIZMO_ROTATE_OFFSET,
  flipOffset = SPRITE_GIZMO_FLIP_OFFSET,
  flipGap = SPRITE_GIZMO_FLIP_GAP,
  flipInset = SPRITE_GIZMO_FLIP_INSET,
): { x: number; y: number } {
  const hx = width / 2;
  const hy = height / 2;
  switch (handle) {
    case "nw":
      return { x: -hx, y: -hy };
    case "ne":
      return { x: hx, y: -hy };
    case "sw":
      return { x: -hx, y: hy };
    case "se":
      return { x: hx, y: hy };
    case "w":
      return { x: -hx, y: 0 };
    case "e":
      return { x: hx, y: 0 };
    case "scaleX":
      return { x: hx, y: 0 };
    case "scaleY":
      return { x: 0, y: hy };
    case "rotate":
      return { x: 0, y: -hy - rotateOffset };
    case "anchor":
      // Caller should prefer gizmoLocalFromAnchor with the live UV.
      return { x: 0, y: 0 };
    case "flipH":
      return { x: -hx + flipInset, y: hy + flipOffset };
    case "flipV":
      return {
        x: -hx + flipInset + flipGap,
        y: hy + flipOffset,
      };
  }
}

export const SPRITE_SIZE_HANDLES: readonly SpriteSizeHandle[] = [
  "nw",
  "ne",
  "sw",
  "se",
  "w",
  "e",
] as const;

export const SPRITE_SCALE_HANDLES: readonly SpriteScaleHandle[] = [
  "scaleX",
  "scaleY",
] as const;
