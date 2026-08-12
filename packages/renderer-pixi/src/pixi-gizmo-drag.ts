import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  anchorFromGizmoLocal,
  getSprite,
  getTransform2D,
  getVisualAnchorOrDefault,
  isSpriteFlipHandle,
  isSpriteSizeHandle,
  positionDeltaForAnchorChange,
  rotationFromHandleDrag,
  sizeFromHandleDrag,
  type SpriteGizmoHandle,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
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
  currentAnchor?: Vec2;
  currentPosition?: Vec2;
}

export interface GizmoDragHost {
  getApp(): Application | undefined;
  world: Container;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  previewSpriteSize(nodeId: string, width: number, height: number): void;
  previewNodeRotation(nodeId: string, rotationDegrees: number): void;
  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void;
  paintVisuals(runtime: RuntimeNode): Promise<void>;
  paintSelection(runtime: RuntimeNode): void;
  paint(runtime: RuntimeNode): void;
  onNodePointerDown?(nodeId: string, world: Vec2): void;
  onGizmoResizeEnd?(nodeId: string, size: { width: number; height: number }): void;
  onGizmoRotateEnd?(nodeId: string, rotation: number): void;
  onGizmoAnchorEnd?(
    nodeId: string,
    result: { anchor: Vec2; position: Vec2 },
  ): void;
  onGizmoFlip?(nodeId: string, axis: "x" | "y"): void;
}

/**
 * Sprite gizmo resize/rotate/anchor drag + flip click.
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
    if (event.button === MOUSE_BUTTON_MIDDLE) {
      return;
    }
    const sprite = getSprite(runtime.node);
    const transform = getTransform2D(runtime.node);
    if (!sprite || !transform) {
      return;
    }

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

    const startWidth = runtime.sizePreview?.width ?? sprite.width;
    const startHeight = runtime.sizePreview?.height ?? sprite.height;
    const bounds = runtime.visualBounds;
    const visualCenter = bounds
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : { x: 0, y: 0 };

    if (handle === "anchor") {
      const startAnchor = getVisualAnchorOrDefault(sprite);
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

    const local = event.getLocalPosition(runtime.visualsRoot);
    // Rotation must be measured in parent space so live preview rotation does
    // not feed back into the pointer→local mapping.
    const parentSpace = runtime.container.parent ?? host.world;
    const parentPoint = event.getLocalPosition(parentSpace);
    const startRotationLocal = {
      x: parentPoint.x - runtime.container.position.x,
      y: parentPoint.y - runtime.container.position.y,
    };
    const startAnchor = getVisualAnchorOrDefault(sprite);
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
        const liveSprite = getSprite(live.node);
        const anchor =
          drag.startAnchor ??
          (liveSprite ? getVisualAnchorOrDefault(liveSprite) : { x: 0.5, y: 0.5 });
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
