import type { Application, Container } from "pixi.js";
import type { Vec2 } from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import type { NodeDragHost } from "./pixi-node-drag.js";
import type { NodeClickHost } from "./pixi-node-click.js";
import type { GizmoDragHost } from "./pixi-gizmo-drag.js";
import type { PixiPointerHandlers } from "./pixi-scene-renderer-types.js";

export interface InteractionHostSource {
  getApp(): Application | undefined;
  world: Container;
  isGizmoDragging(): boolean;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  getSnapGridSize(): number | undefined;
  getPointerHandlers(): PixiPointerHandlers | undefined;
  pickNodeId?(clientX: number, clientY: number): string | undefined;
  previewNodePosition(nodeId: string, position: Vec2): void;
  previewSpriteSize(nodeId: string, width: number, height: number): void;
  previewNodeRotation(nodeId: string, rotationDegrees: number): void;
  previewNodeScale(nodeId: string, scale: Vec2): void;
  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void;
  paintVisuals(runtime: RuntimeNode): Promise<void>;
  paintSelection(runtime: RuntimeNode): void;
  paint(runtime: RuntimeNode): void;
}

export function createNodeDragHost(source: InteractionHostSource): NodeDragHost {
  return {
    getApp: () => source.getApp(),
    world: source.world,
    isGizmoDragging: () => source.isGizmoDragging(),
    getRuntime: (nodeId) => source.getRuntime(nodeId),
    getSnapGridSize: () => source.getSnapGridSize(),
    previewNodePosition: (nodeId, position) =>
      source.previewNodePosition(nodeId, position),
    pickNodeId: (clientX, clientY) => source.pickNodeId?.(clientX, clientY),
    onNodePointerDown: (nodeId, world) =>
      source.getPointerHandlers()?.onNodePointerDown?.(nodeId, world),
    onNodePointerMove: (nodeId, world) =>
      source.getPointerHandlers()?.onNodePointerMove?.(nodeId, world),
    onNodePointerUp: (nodeId, start, end) =>
      source.getPointerHandlers()?.onNodePointerUp?.(nodeId, start, end),
  };
}

export function createNodeClickHost(
  source: InteractionHostSource,
): NodeClickHost {
  return {
    getApp: () => source.getApp(),
    onNodeClick: (nodeId) =>
      source.getPointerHandlers()?.onNodeClick?.(nodeId),
    onNodePointerEvent: (nodeId, event) =>
      source.getPointerHandlers()?.onNodePointerEvent?.(nodeId, event),
  };
}

export function createGizmoDragHost(
  source: InteractionHostSource,
): GizmoDragHost {
  return {
    getApp: () => source.getApp(),
    world: source.world,
    getRuntime: (nodeId) => source.getRuntime(nodeId),
    previewSpriteSize: (nodeId, width, height) =>
      source.previewSpriteSize(nodeId, width, height),
    previewNodeRotation: (nodeId, rotation) =>
      source.previewNodeRotation(nodeId, rotation),
    previewNodeScale: (nodeId, scale) =>
      source.previewNodeScale(nodeId, scale),
    previewSpriteAnchor: (nodeId, anchor, position) =>
      source.previewSpriteAnchor(nodeId, anchor, position),
    paintVisuals: (runtime) => source.paintVisuals(runtime),
    paintSelection: (runtime) => source.paintSelection(runtime),
    paint: (runtime) => source.paint(runtime),
    onNodePointerDown: (nodeId, world) =>
      source.getPointerHandlers()?.onNodePointerDown?.(nodeId, world),
    onGizmoResizeEnd: (nodeId, size) =>
      source.getPointerHandlers()?.onGizmoResizeEnd?.(nodeId, size),
    onGizmoRotateEnd: (nodeId, rotation) =>
      source.getPointerHandlers()?.onGizmoRotateEnd?.(nodeId, rotation),
    onGizmoScaleEnd: (nodeId, scale) =>
      source.getPointerHandlers()?.onGizmoScaleEnd?.(nodeId, scale),
    onGizmoAnchorEnd: (nodeId, result) =>
      source.getPointerHandlers()?.onGizmoAnchorEnd?.(nodeId, result),
    onGizmoFlip: (nodeId, axis) =>
      source.getPointerHandlers()?.onGizmoFlip?.(nodeId, axis),
  };
}
