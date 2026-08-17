import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  DEFAULT_VISUAL_ANCHOR,
  anchorFromGizmoLocal,
  getTransform2D,
  getVisualAnchorOrDefault,
  getVisualComponent,
  getVisualDisplaySize,
  isSpriteFlipHandle,
  isSpriteScaleHandle,
  isSpriteSizeHandle,
  positionDeltaForAnchorChange,
  rotationFromHandleDrag,
  scaleFromAxisDrag,
  sizeFromHandleDrag,
  visualComponentSupportsAnchor,
  visualComponentSupportsDisplaySize,
  type SpriteGizmoHandle,
  type SpriteScaleHandle,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_SECONDARY } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

interface GizmoDragState {
  nodeId: string;
  pointerId: number;
  handle: SpriteGizmoHandle;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  startLocal: Vec2;
  /** Visual center in visualsRoot space (accounts for non-center anchors). */
  visualCenter: Vec2;
  currentWidth: number;
  currentHeight: number;
  currentRotation: number;
  /** Anchor drag: UV at pointer-down. */
  startAnchor?: Vec2;
  /** Anchor drag: parent-space position at pointer-down. */
  startPosition?: Vec2;
  startScale?: Vec2;
  currentScale?: Vec2;
  currentAnchor?: Vec2;
  currentPosition?: Vec2;
  /** Parent-space axis distance at pointer-down (scale arrows). */
  startScaleAxis?: number;
}

export interface GizmoDragHost {
  getApp(): Application | undefined;
  world: Container;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  previewSpriteSize(nodeId: string, width: number, height: number): void;
  previewNodeRotation(nodeId: string, rotationDegrees: number): void;
  previewNodeScale(nodeId: string, scale: Vec2): void;
  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void;
  paintVisuals(runtime: RuntimeNode): Promise<void>;
  paintSelection(runtime: RuntimeNode): void;
  paint(runtime: RuntimeNode): void;
  onNodePointerDown?(nodeId: string, world: Vec2): void;
  onGizmoResizeEnd?(nodeId: string, size: { width: number; height: number }): void;
  onGizmoRotateEnd?(nodeId: string, rotation: number): void;
  onGizmoScaleEnd?(nodeId: string, scale: Vec2): void;
  onGizmoAnchorEnd?(
    nodeId: string,
    result: { anchor: Vec2; position: Vec2 },
  ): void;
  onGizmoFlip?(nodeId: string, axis: "x" | "y"): void;
}

/**
 * Selection gizmo resize/scale/rotate/anchor drag + flip click.
 * Works for leaf visuals and Transform2D grouping nodes (scale/rotate/flip).
 * Visual chrome lives in SpriteSelectionGizmo.
 */
export class PixiGizmoDragController {
  private gizmoDrag: GizmoDragState | undefined;

  get active(): GizmoDragState | undefined {
    return this.gizmoDrag;
  }

  isActiveFor(nodeId: string): boolean {
    return this.gizmoDrag?.nodeId === nodeId;
  }

  get isDragging(): boolean {
    return this.gizmoDrag !== undefined;
  }

  begin(
    runtime: RuntimeNode,
    handle: SpriteGizmoHandle,
    event: FederatedPointerEvent,
    host: GizmoDragHost,
  ): void {
    if (
      event.button === MOUSE_BUTTON_MIDDLE ||
      event.button === MOUSE_BUTTON_SECONDARY
    ) {
      return;
    }
    const transform = getTransform2D(runtime.node);
    if (!transform) {
      return;
    }
    if (runtime.editorLocked) {
      host.onNodePointerDown?.(runtime.node.id, {
        x: transform.position.x,
        y: transform.position.y,
      });
      return;
    }
    const visual = getVisualComponent(runtime.node);

    host.onNodePointerDown?.(runtime.node.id, {
      x: transform.position.x,
      y: transform.position.y,
    });

    if (isSpriteFlipHandle(handle)) {
      host.onGizmoFlip?.(
        runtime.node.id,
        handle === "flipH" ? "x" : "y",
      );
      return;
    }

    const app = host.getApp();
    if (!app) {
      return;
    }

    const displaySize = visual ? getVisualDisplaySize(visual) : undefined;
    const startWidth =
      runtime.sizePreview?.width ??
      displaySize?.width ??
      runtime.visualBounds?.width ??
      0;
    const startHeight =
      runtime.sizePreview?.height ??
      displaySize?.height ??
      runtime.visualBounds?.height ??
      0;
    if (startWidth <= 0 || startHeight <= 0) {
      return;
    }

    const bounds = runtime.visualBounds;
    const visualCenter = bounds
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : { x: 0, y: 0 };

    if (handle === "anchor") {
      if (!visual || !visualComponentSupportsAnchor(visual)) {
        return;
      }
      const startAnchor = getVisualAnchorOrDefault(visual);
      const startPosition = { ...transform.position };
      const startScale = { ...transform.scale };
      this.gizmoDrag = {
        nodeId: runtime.node.id,
        pointerId: event.pointerId,
        handle,
        startWidth,
        startHeight,
        startRotation: transform.rotation,
        startLocal: { x: 0, y: 0 },
        visualCenter,
        currentWidth: startWidth,
        currentHeight: startHeight,
        currentRotation: transform.rotation,
        startAnchor,
        startPosition,
        startScale,
        currentAnchor: { ...startAnchor },
        currentPosition: { ...startPosition },
      };

      const onMove = (moveEvent: FederatedPointerEvent) => {
        const drag = this.gizmoDrag;
        if (!drag || moveEvent.pointerId !== drag.pointerId) {
          return;
        }
        if (
          !drag.startAnchor ||
          !drag.startPosition ||
          !drag.startScale ||
          !drag.currentAnchor ||
          !drag.currentPosition
        ) {
          return;
        }
        const live = host.getRuntime(drag.nodeId);
        if (!live?.gizmo) {
          return;
        }
        const point = moveEvent.getLocalPosition(live.gizmo.root);
        const nextAnchor = anchorFromGizmoLocal(
          point.x,
          point.y,
          drag.startWidth,
          drag.startHeight,
        );
        const delta = positionDeltaForAnchorChange(
          drag.startAnchor,
          nextAnchor,
          drag.startWidth,
          drag.startHeight,
          drag.startRotation,
          drag.startScale,
        );
        const nextPosition = {
          x: drag.startPosition.x + delta.x,
          y: drag.startPosition.y + delta.y,
        };
        drag.currentAnchor = nextAnchor;
        drag.currentPosition = nextPosition;
        host.previewSpriteAnchor(drag.nodeId, nextAnchor, nextPosition);
      };

      const onUp = (upEvent: FederatedPointerEvent) => {
        const drag = this.gizmoDrag;
        if (!drag || upEvent.pointerId !== drag.pointerId) {
          return;
        }
        this.gizmoDrag = undefined;
        appOff();
        const live = host.getRuntime(drag.nodeId);
        if (live) {
          live.sizePreview = undefined;
          live.anchorPreview = undefined;
        }
        const anchor = drag.currentAnchor;
        const position = drag.currentPosition;
        const startAnchor = drag.startAnchor;
        const startPosition = drag.startPosition;
        if (
          anchor &&
          position &&
          startAnchor &&
          startPosition &&
          (anchor.x !== startAnchor.x ||
            anchor.y !== startAnchor.y ||
            position.x !== startPosition.x ||
            position.y !== startPosition.y)
        ) {
          host.onGizmoAnchorEnd?.(drag.nodeId, { anchor, position });
        } else if (live) {
          void host.paintVisuals(live);
          host.paintSelection(live);
        }
      };

      const appOff = () => {
        app.stage.off("pointermove", onMove);
        app.stage.off("pointerup", onUp);
        app.stage.off("pointerupoutside", onUp);
      };

      app.stage.on("pointermove", onMove);
      app.stage.on("pointerup", onUp);
      app.stage.on("pointerupoutside", onUp);
      return;
    }

    if (
      isSpriteSizeHandle(handle) &&
      (!visual || !visualComponentSupportsDisplaySize(visual))
    ) {
      return;
    }
    if (
      isSpriteScaleHandle(handle) &&
      visual &&
      visualComponentSupportsDisplaySize(visual)
    ) {
      return;
    }

    const local = event.getLocalPosition(runtime.visualsRoot);
    // Rotation / scale must be measured in parent space so live preview
    // transform does not feed back into the pointer→local mapping.
    const parentSpace = runtime.container.parent ?? host.world;
    const parentPoint = event.getLocalPosition(parentSpace);
    const startRotationLocal = {
      x: parentPoint.x - runtime.container.position.x,
      y: parentPoint.y - runtime.container.position.y,
    };
    const startAnchor = visual
      ? getVisualAnchorOrDefault(visual)
      : DEFAULT_VISUAL_ANCHOR;
    const startScale = { ...transform.scale };
    const startScaleAxis = isSpriteScaleHandle(handle)
      ? parentAxisDistance(
          handle,
          parentPoint.x - runtime.container.position.x,
          parentPoint.y - runtime.container.position.y,
          runtime.container.rotation,
        )
      : undefined;

    this.gizmoDrag = {
      nodeId: runtime.node.id,
      pointerId: event.pointerId,
      handle,
      startWidth,
      startHeight,
      startRotation: transform.rotation,
      startLocal: isSpriteSizeHandle(handle)
        ? { x: local.x, y: local.y }
        : startRotationLocal,
      visualCenter,
      currentWidth: startWidth,
      currentHeight: startHeight,
      currentRotation: transform.rotation,
      startAnchor,
      startScale,
      currentScale: { ...startScale },
      startScaleAxis,
    };

    const onMove = (moveEvent: FederatedPointerEvent) => {
      const drag = this.gizmoDrag;
      if (!drag || moveEvent.pointerId !== drag.pointerId) {
        return;
      }
      const live = host.getRuntime(drag.nodeId);
      if (!live) {
        return;
      }
      if (isSpriteSizeHandle(drag.handle)) {
        const point = moveEvent.getLocalPosition(live.visualsRoot);
        const liveVisual = getVisualComponent(live.node);
        const anchor =
          drag.startAnchor ??
          (liveVisual
            ? getVisualAnchorOrDefault(liveVisual)
            : { x: 0.5, y: 0.5 });
        const size = sizeFromHandleDrag(
          drag.handle,
          point.x,
          point.y,
          drag.startWidth,
          drag.startHeight,
          { uniform: moveEvent.shiftKey, anchor },
        );
        drag.currentWidth = size.width;
        drag.currentHeight = size.height;
        host.previewSpriteSize(drag.nodeId, size.width, size.height);
      } else if (isSpriteScaleHandle(drag.handle) && drag.startScale) {
        const parent = live.container.parent ?? host.world;
        const point = moveEvent.getLocalPosition(parent);
        const currentAxis = parentAxisDistance(
          drag.handle,
          point.x - live.container.position.x,
          point.y - live.container.position.y,
          (drag.startRotation * Math.PI) / 180,
        );
        const startAxis = drag.startScaleAxis ?? 0;
        const scale = scaleFromAxisDrag(
          drag.handle,
          currentAxis,
          startAxis,
          drag.startScale,
          { uniform: moveEvent.shiftKey },
        );
        drag.currentScale = scale;
        host.previewNodeScale(drag.nodeId, scale);
      } else {
        const parent = live.container.parent ?? host.world;
        const point = moveEvent.getLocalPosition(parent);
        const rotation = rotationFromHandleDrag(
          point.x - live.container.position.x,
          point.y - live.container.position.y,
          drag.startLocal.x,
          drag.startLocal.y,
          drag.startRotation,
        );
        drag.currentRotation = rotation;
        host.previewNodeRotation(drag.nodeId, rotation);
      }
    };

    const onUp = (upEvent: FederatedPointerEvent) => {
      const drag = this.gizmoDrag;
      if (!drag || upEvent.pointerId !== drag.pointerId) {
        return;
      }
      this.gizmoDrag = undefined;
      appOff();
      const live = host.getRuntime(drag.nodeId);
      if (live) {
        live.sizePreview = undefined;
        live.anchorPreview = undefined;
      }

      if (isSpriteSizeHandle(drag.handle)) {
        if (
          drag.currentWidth !== drag.startWidth ||
          drag.currentHeight !== drag.startHeight
        ) {
          host.onGizmoResizeEnd?.(drag.nodeId, {
            width: drag.currentWidth,
            height: drag.currentHeight,
          });
        } else if (live) {
          void host.paintVisuals(live);
          host.paintSelection(live);
        }
      } else if (isSpriteScaleHandle(drag.handle)) {
        const start = drag.startScale;
        const current = drag.currentScale;
        if (
          start &&
          current &&
          (current.x !== start.x || current.y !== start.y)
        ) {
          host.onGizmoScaleEnd?.(drag.nodeId, current);
        } else if (live) {
          host.paint(live);
        }
      } else if (drag.currentRotation !== drag.startRotation) {
        host.onGizmoRotateEnd?.(drag.nodeId, drag.currentRotation);
      } else if (live) {
        host.paint(live);
      }
    };

    const appOff = () => {
      app.stage.off("pointermove", onMove);
      app.stage.off("pointerup", onUp);
      app.stage.off("pointerupoutside", onUp);
    };

    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup", onUp);
    app.stage.on("pointerupoutside", onUp);
  }
}

/** Project parent-space offset into the container's local X/Y (includes scale). */
function parentAxisDistance(
  handle: SpriteScaleHandle,
  parentDx: number,
  parentDy: number,
  rotationRadians: number,
): number {
  const c = Math.cos(rotationRadians);
  const s = Math.sin(rotationRadians);
  const localX = parentDx * c + parentDy * s;
  const localY = -parentDx * s + parentDy * c;
  return handle === "scaleX" ? localX : localY;
}
