import type { PixiRuntimeGraph, RuntimeNode } from "./pixi-runtime-nodes.js";
import type { PixelGridOverlay } from "./pixel-grid.js";
import type { ScreenGuidesOverlay } from "./screen-guides.js";
import { hitAreaFromBounds } from "./pixi-visual-hit-area.js";
import { localScaleTowardAncestor } from "./pixi-chrome-scale.js";
import {
  visibleWorldRect,
  type ViewportCameraState,
} from "./viewport-camera.js";
import { PIXEL_GRID_VIEW_PAD } from "./editor-chrome.js";

export interface EditorOverlaySyncHost {
  width: number;
  height: number;
  graph: PixiRuntimeGraph;
  pixelGrid: PixelGridOverlay | undefined;
  screenGuides: ScreenGuidesOverlay | undefined;
  getCameraState(): Readonly<ViewportCameraState>;
  getSelectedNodeIds(): ReadonlySet<string>;
  paintSelection(runtime: RuntimeNode): void;
}

/**
 * Redraws editor-only overlays and refreshes selection chrome under zoom/pan.
 */
export function redrawEditorOverlays(host: EditorOverlaySyncHost): void {
  const camera = host.getCameraState();
  const cameraScale = camera.scale;
  if (host.pixelGrid) {
    const rect = visibleWorldRect(host.width, host.height, camera);
    // Pad so lines stay continuous while panning.
    const pad = PIXEL_GRID_VIEW_PAD;
    host.pixelGrid.redrawBounds(
      rect.minX - pad,
      rect.minY - pad,
      rect.maxX + pad,
      rect.maxY + pad,
      cameraScale,
    );
  }
  host.screenGuides?.redraw(cameraScale);
  // Selection chrome + gizmo hit pads are screen-constant under zoom
  // and node scale.
  for (const runtime of host.graph.values()) {
    if (
      runtime.visualBounds &&
      runtime.visualsRoot !== runtime.container
    ) {
      runtime.visualsRoot.hitArea = hitAreaFromBounds(
        runtime.visualBounds,
        cameraScale,
        localScaleTowardAncestor(runtime.container, host.graph.world),
      );
    }
    if (host.getSelectedNodeIds().has(runtime.node.id)) {
      host.paintSelection(runtime);
    }
  }
}
