import type { Container } from "pixi.js";
import { getTilemap } from "@game-editor/scene";
import type { PixiRuntimeGraph, RuntimeNode } from "./pixi-runtime-nodes.js";
import type { PixelGridOverlay } from "./pixel-grid.js";
import type { ScreenGuidesOverlay } from "./screen-guides.js";
import type { TilemapGridOverlay } from "./tilemap-grid-overlay.js";
import { hitAreaFromBounds } from "./pixi-visual-hit-area.js";
import { localScaleTowardAncestor } from "./pixi-chrome-scale.js";
import {
  visibleWorldRect,
  type ViewportCameraState,
  type WorldRect,
} from "./viewport-camera.js";
import { PIXEL_GRID_VIEW_PAD } from "./editor-chrome.js";

export interface EditorOverlaySyncHost {
  width: number;
  height: number;
  graph: PixiRuntimeGraph;
  pixelGrid: PixelGridOverlay | undefined;
  tilemapGrid: TilemapGridOverlay | undefined;
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
  syncTilemapGridOverlay(host);
}

function syncTilemapGridOverlay(host: EditorOverlaySyncHost): void {
  const overlay = host.tilemapGrid;
  if (!overlay) {
    return;
  }
  const selectedIds = [...host.getSelectedNodeIds()];
  const primaryId = selectedIds[selectedIds.length - 1];
  const runtime = primaryId ? host.graph.get(primaryId) : undefined;
  const tilemap = runtime ? getTilemap(runtime.node) : undefined;
  if (!runtime || !tilemap) {
    overlay.hide();
    return;
  }
  if (overlay.root.parent !== runtime.visualsRoot) {
    runtime.visualsRoot.addChild(overlay.root);
  }
  const camera = host.getCameraState();
  const world = visibleWorldRect(host.width, host.height, camera);
  overlay.redraw(tilemap, worldRectToLocal(runtime.container, world), camera.scale);
}

function worldRectToLocal(container: Container, rect: WorldRect): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const inverse = container.worldTransform.clone().invert();
  const corners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.minX, y: rect.maxY },
    { x: rect.maxX, y: rect.maxY },
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const out = { x: 0, y: 0 };
  for (const corner of corners) {
    inverse.apply(corner, out);
    minX = Math.min(minX, out.x);
    minY = Math.min(minY, out.y);
    maxX = Math.max(maxX, out.x);
    maxY = Math.max(maxY, out.y);
  }
  return { minX, minY, maxX, maxY };
}
