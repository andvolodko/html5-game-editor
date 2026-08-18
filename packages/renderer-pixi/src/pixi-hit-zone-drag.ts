import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  applySizeToHitZoneShape,
  getHitZoneOffset,
  hitZoneShapeSize,
  hitZoneSizeFromHandleDrag,
  insertHitZonePolygonPointOnEdge,
  removeHitZonePolygonPoint,
  setHitZonePolygonPoint,
  sizeFromHandleDrag,
  type HitZoneComponentData,
  type SpriteSizeHandle,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_SECONDARY } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { effectiveHitZone } from "./pixi-hit-zone-pick.js";
import type { HitZoneGizmoHandle } from "./pixi-hit-zone-gizmo.js";

type HitZoneDragKind = "move" | "resize" | "vertex";

interface HitZoneDragState {
  nodeId: string;
  pointerId: number;
  kind: HitZoneDragKind;
  handle?: SpriteSizeHandle;
  vertexIndex?: number;
  /** Document state at pointer-down (before insert). */
  original: HitZoneComponentData;
  /** Shape the live edit is based on (after optional insert). */
  base: HitZoneComponentData;
  current: HitZoneComponentData;
  grab?: Vec2;
}

export interface HitZoneDragHost {
  getApp(): Application | undefined;
  world: Container;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  previewHitZone(nodeId: string, hitZone: HitZoneComponentData): void;
  paintSelection(nodeId: string): void;
  onHitZoneResizeEnd?(nodeId: string, hitZone: HitZoneComponentData): void;
}

/**
 * HitZone overlay-move, size-handle, and polygon-vertex drag.
 * Pointer math is in visualsRoot (node-local). One gesture → one command.
 */
export class PixiHitZoneDragController {
  private drag: HitZoneDragState | undefined;

  get isDragging(): boolean {
    return this.drag !== undefined;
  }

  isActiveFor(nodeId: string): boolean {
    return this.drag?.nodeId === nodeId;
  }

  beginMove(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
    host: HitZoneDragHost,
  ): void {
    const hitZone = effectiveHitZone(runtime);
    if (!hitZone) {
      return;
    }
    const local = event.getLocalPosition(runtime.visualsRoot);
    const offset = getHitZoneOffset(hitZone);
    this.begin(runtime, event, host, {
      kind: "move",
      original: structuredClone(hitZone),
      base: structuredClone(hitZone),
      grab: { x: local.x - offset.x, y: local.y - offset.y },
    });
  }

  beginHandle(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
    host: HitZoneDragHost,
  ): void {
    if (event.button === MOUSE_BUTTON_MIDDLE) {
      return;
    }
    const hitZone = effectiveHitZone(runtime);
    if (!hitZone) {
      return;
    }
    if (handle.kind === "size") {
      const size = hitZoneShapeSize(hitZone.shape);
      if (!size) {
        return;
      }
      this.begin(runtime, event, host, {
        kind: "resize",
        handle: handle.handle,
        original: structuredClone(hitZone),
        base: structuredClone(hitZone),
      });
      return;
    }
    if (handle.kind === "vertex") {
      if (event.button === MOUSE_BUTTON_SECONDARY) {
        this.commitRemovedVertex(runtime, hitZone, handle.index, host);
        return;
      }
      this.begin(runtime, event, host, {
        kind: "vertex",
        vertexIndex: handle.index,
        original: structuredClone(hitZone),
        base: structuredClone(hitZone),
      });
      return;
    }
    if (event.button === MOUSE_BUTTON_SECONDARY) {
      return;
    }
    const inserted = {
      ...hitZone,
      shape: insertHitZonePolygonPointOnEdge(hitZone.shape, handle.index),
    };
    this.begin(runtime, event, host, {
      kind: "vertex",
      vertexIndex: handle.index + 1,
      original: structuredClone(hitZone),
      base: structuredClone(inserted),
      current: structuredClone(inserted),
    });
    host.previewHitZone(runtime.node.id, inserted);
  }

  private commitRemovedVertex(
    runtime: RuntimeNode,
    hitZone: HitZoneComponentData,
    index: number,
    host: HitZoneDragHost,
  ): void {
    const nextShape = removeHitZonePolygonPoint(hitZone.shape, index);
    if (JSON.stringify(nextShape) === JSON.stringify(hitZone.shape)) {
      return;
    }
    host.onHitZoneResizeEnd?.(runtime.node.id, {
      ...hitZone,
      shape: nextShape,
    });
  }

  private begin(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
    host: HitZoneDragHost,
    init: Omit<HitZoneDragState, "nodeId" | "pointerId" | "current"> & {
      current?: HitZoneComponentData;
    },
  ): void {
    if (
      event.button === MOUSE_BUTTON_MIDDLE ||
      event.button === MOUSE_BUTTON_SECONDARY
    ) {
      return;
    }
    this.drag = {
      nodeId: runtime.node.id,
      pointerId: event.pointerId,
      kind: init.kind,
      handle: init.handle,
      vertexIndex: init.vertexIndex,
      original: init.original,
      base: init.base,
      current: init.current ?? structuredClone(init.base),
      grab: init.grab,
    };
    const app = host.getApp();
    if (!app) {
      return;
    }

    const onMove = (moveEvent: FederatedPointerEvent) => {
      const drag = this.drag;
      if (!drag || moveEvent.pointerId !== drag.pointerId) {
        return;
      }
      const live = host.getRuntime(drag.nodeId);
      if (!live) {
        return;
      }
      const local = moveEvent.getLocalPosition(live.visualsRoot);
      if (drag.kind === "move") {
        const grab = drag.grab;
        if (!grab) {
          return;
        }
        drag.current = {
          ...drag.base,
          offset: { x: local.x - grab.x, y: local.y - grab.y },
        };
      } else if (drag.kind === "vertex") {
        const index = drag.vertexIndex;
        if (index === undefined) {
          return;
        }
        const offset = getHitZoneOffset(drag.base);
        drag.current = {
          ...drag.base,
          shape: setHitZonePolygonPoint(drag.base.shape, index, {
            x: local.x - offset.x,
            y: local.y - offset.y,
          }),
        };
      } else {
        applyResizeMove(drag, local, moveEvent.shiftKey);
      }
      host.previewHitZone(drag.nodeId, drag.current);
    };

    const onUp = (upEvent: FederatedPointerEvent) => {
      const drag = this.drag;
      if (!drag || upEvent.pointerId !== drag.pointerId) {
        return;
      }
      this.drag = undefined;
      appOff();
      const live = host.getRuntime(drag.nodeId);
      if (live) {
        live.hitZonePreview = undefined;
      }
      if (hitZoneChanged(drag.original, drag.current)) {
        host.onHitZoneResizeEnd?.(drag.nodeId, drag.current);
      } else {
        host.paintSelection(drag.nodeId);
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

function applyResizeMove(
  drag: HitZoneDragState,
  local: Vec2,
  shiftKey: boolean,
): void {
  const handle = drag.handle;
  const startSize = hitZoneShapeSize(drag.base.shape);
  if (!handle || !startSize) {
    return;
  }
  if (drag.base.shape.type === "circle") {
    const offset = getHitZoneOffset(drag.base);
    const nextSize = sizeFromHandleDrag(
      handle,
      local.x - offset.x,
      local.y - offset.y,
      startSize.width,
      startSize.height,
      { uniform: true, anchor: { x: 0.5, y: 0.5 } },
    );
    drag.current = {
      ...drag.base,
      shape: applySizeToHitZoneShape(
        drag.base.shape,
        nextSize.width,
        nextSize.height,
      ),
    };
    return;
  }
  const nextSize = hitZoneSizeFromHandleDrag(
    handle,
    local.x,
    local.y,
    getHitZoneOffset(drag.base),
    startSize.width,
    startSize.height,
    { uniform: shiftKey },
  );
  drag.current = {
    ...drag.base,
    offset: nextSize.offset,
    shape: applySizeToHitZoneShape(
      drag.base.shape,
      nextSize.width,
      nextSize.height,
    ),
  };
}

function hitZoneChanged(
  before: HitZoneComponentData,
  after: HitZoneComponentData,
): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}
