import { fitContainRect } from "@game-editor/project";

const MIN_VIEW = 1;

/** Axis-aligned letterbox in top-left canvas pixels (same units as `setSize`). */
export interface DesignLetterbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DesignResolution {
  width: number;
  height: number;
}

/**
 * Contain-fit the authored design inside the Three canvas so 3D stays aligned
 * with the Pixi expand/contain design rectangle. Extra bands stay transparent
 * (hybrid Pixi world) instead of stretching the camera.
 */
export function computeDesignLetterbox(
  design: DesignResolution,
  canvas: DesignResolution,
): DesignLetterbox {
  const fitted = fitContainRect(design, canvas);
  return {
    x: Math.round(fitted.x),
    y: Math.round(fitted.y),
    width: Math.max(MIN_VIEW, Math.round(fitted.width)),
    height: Math.max(MIN_VIEW, Math.round(fitted.height)),
  };
}

/** Three.js `setViewport` Y is measured from the bottom of the drawing buffer. */
export function letterboxToThreeViewport(
  box: DesignLetterbox,
  canvasHeight: number,
): DesignLetterbox {
  return {
    x: box.x,
    y: canvasHeight - box.y - box.height,
    width: box.width,
    height: box.height,
  };
}

export function designCameraAspect(design: DesignResolution): number {
  return Math.max(design.width, MIN_VIEW) / Math.max(design.height, MIN_VIEW);
}

/**
 * Map a client pixel into NDC for the letterboxed 3D view.
 * Returns undefined when the point is in the unused (Pixi-only) bands.
 */
export function clientPointToLetterboxNdc(
  clientX: number,
  clientY: number,
  canvasRect: CanvasClientRect,
  box: DesignLetterbox,
  canvasSize: DesignResolution,
): { x: number; y: number } | undefined {
  const canvasWidth = Math.max(canvasSize.width, MIN_VIEW);
  const canvasHeight = Math.max(canvasSize.height, MIN_VIEW);
  const scaleX = canvasRect.width / canvasWidth;
  const scaleY = canvasRect.height / canvasHeight;
  const viewX = box.x * scaleX;
  const viewY = box.y * scaleY;
  const viewWidth = Math.max(box.width * scaleX, MIN_VIEW);
  const viewHeight = Math.max(box.height * scaleY, MIN_VIEW);
  const localX = clientX - canvasRect.left;
  const localY = clientY - canvasRect.top;
  if (
    localX < viewX ||
    localY < viewY ||
    localX > viewX + viewWidth ||
    localY > viewY + viewHeight
  ) {
    return undefined;
  }
  return {
    x: ((localX - viewX) / viewWidth) * 2 - 1,
    y: -((localY - viewY) / viewHeight) * 2 + 1,
  };
}
