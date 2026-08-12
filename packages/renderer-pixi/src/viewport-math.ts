import type { Vec2 } from "@game-editor/scene";

/**
 * Convert a browser client point into world coordinates.
 * Optional pan/scale map screen pixels through the editor preview camera.
 */
export function clientPointToWorld(input: {
  clientX: number;
  clientY: number;
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  screenWidth: number;
  screenHeight: number;
  /** Preview camera pan in screen pixels (default identity). */
  panX?: number;
  panY?: number;
  /** Preview camera uniform scale (default 1). */
  scale?: number;
}): Vec2 {
  if (input.canvasWidth <= 0 || input.canvasHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const screenX =
    ((input.clientX - input.canvasLeft) / input.canvasWidth) * input.screenWidth;
  const screenY =
    ((input.clientY - input.canvasTop) / input.canvasHeight) *
    input.screenHeight;
  const scale = input.scale === undefined || input.scale === 0 ? 1 : input.scale;
  const panX = input.panX ?? 0;
  const panY = input.panY ?? 0;
  return {
    x: (screenX - panX) / scale,
    y: (screenY - panY) / scale,
  };
}
