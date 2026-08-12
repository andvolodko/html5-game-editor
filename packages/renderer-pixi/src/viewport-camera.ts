import type { Vec2 } from "@game-editor/scene";

export interface ViewportCameraState {
  /** Screen-space offset of world origin. */
  pan: Vec2;
  /** Uniform preview scale (1 = 100%). */
  scale: number;
}

export interface WorldRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const DEFAULT_VIEWPORT_SCALE = 1;
export const MIN_VIEWPORT_SCALE = 0.1;
export const MAX_VIEWPORT_SCALE = 8;
export const VIEWPORT_SCALE_STEP = 0.1;

export function clampViewportScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    return DEFAULT_VIEWPORT_SCALE;
  }
  return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale));
}

/**
 * Inverse preview-camera scale so editor chrome (handles, guide labels)
 * stays constant in screen pixels while the world zooms.
 */
export function viewportChromeInvScale(cameraScale: number): number {
  if (!Number.isFinite(cameraScale) || Math.abs(cameraScale) < 1e-9) {
    return 1;
  }
  return 1 / Math.abs(cameraScale);
}

export function createDefaultViewportCamera(): ViewportCameraState {
  return {
    pan: { x: 0, y: 0 },
    scale: DEFAULT_VIEWPORT_SCALE,
  };
}

/**
 * Convert a point in screen/renderer pixels to world space under pan/zoom.
 */
export function screenToWorld(
  screen: Vec2,
  camera: ViewportCameraState,
): Vec2 {
  const scale = camera.scale === 0 ? 1 : camera.scale;
  return {
    x: (screen.x - camera.pan.x) / scale,
    y: (screen.y - camera.pan.y) / scale,
  };
}

/**
 * Convert a world point to screen/renderer pixels under pan/zoom.
 */
export function worldToScreen(
  world: Vec2,
  camera: ViewportCameraState,
): Vec2 {
  return {
    x: world.x * camera.scale + camera.pan.x,
    y: world.y * camera.scale + camera.pan.y,
  };
}

/**
 * Visible world rectangle for a screen-sized viewport.
 */
export function visibleWorldRect(
  screenWidth: number,
  screenHeight: number,
  camera: ViewportCameraState,
): WorldRect {
  const topLeft = screenToWorld({ x: 0, y: 0 }, camera);
  const bottomRight = screenToWorld(
    { x: screenWidth, y: screenHeight },
    camera,
  );
  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxX: Math.max(topLeft.x, bottomRight.x),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

/**
 * Change scale while keeping `anchorScreen` fixed on the same world point.
 */
export function zoomAtScreenPoint(
  camera: ViewportCameraState,
  nextScale: number,
  anchorScreen: Vec2,
): ViewportCameraState {
  const scale = clampViewportScale(nextScale);
  if (scale === camera.scale) {
    return camera;
  }
  const world = screenToWorld(anchorScreen, camera);
  return {
    scale,
    pan: {
      x: anchorScreen.x - world.x * scale,
      y: anchorScreen.y - world.y * scale,
    },
  };
}

export function panByScreenDelta(
  camera: ViewportCameraState,
  delta: Vec2,
): ViewportCameraState {
  return {
    scale: camera.scale,
    pan: {
      x: camera.pan.x + delta.x,
      y: camera.pan.y + delta.y,
    },
  };
}
