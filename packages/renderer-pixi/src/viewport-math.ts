import type { Vec2 } from "@game-editor/scene";

export interface ClientCanvasRect {
  clientX: number;
  clientY: number;
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Map a browser client point onto the renderer screen (design pixels).
 * CSS canvas size can differ from `app.screen` when the game frame is
 * contain/cover/expand-fitted.
 */
export function clientPointToScreen(input: ClientCanvasRect): Vec2 {
  if (input.canvasWidth <= 0 || input.canvasHeight <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x:
      ((input.clientX - input.canvasLeft) / input.canvasWidth) *
      input.screenWidth,
    y:
      ((input.clientY - input.canvasTop) / input.canvasHeight) *
      input.screenHeight,
  };
}

/**
 * Convert a browser client point into world coordinates.
 * Optional pan/scale map screen pixels through the editor preview camera.
 */
export function clientPointToWorld(
  input: ClientCanvasRect & {
    /** Preview camera pan in screen pixels (default identity). */
    panX?: number;
    panY?: number;
    /** Preview camera uniform scale (default 1). */
    scale?: number;
  },
): Vec2 {
  const screen = clientPointToScreen(input);
  const scale = input.scale === undefined || input.scale === 0 ? 1 : input.scale;
  const panX = input.panX ?? 0;
  const panY = input.panY ?? 0;
  return {
    x: (screen.x - panX) / scale,
    y: (screen.y - panY) / scale,
  };
}
