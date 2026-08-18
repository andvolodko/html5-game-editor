import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  applySizeToHitZoneShape,
  getHitZoneOffset,
  hitZoneShapeSize,
  hitZoneSizeFromHandleDrag,
  insertHitZonePolygonPointOnEdge,
  maskAsHitZone,
  removeHitZonePolygonPoint,
  setHitZonePolygonPoint,
  sizeFromHandleDrag,
  type HitZoneComponentData,
  type MaskComponentData,
  type SpriteSizeHandle,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_SECONDARY } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { effectiveMask } from "./pixi-mask-pick.js";
import type { HitZoneGizmoHandle } from "./pixi-hit-zone-gizmo.js";

type MaskDragKind = "move" | "resize" | "vertex";

interface MaskDragState {
  nodeId: string;
  pointerId: number;
  kind: MaskDragKind;
  handle?: SpriteSizeHandle;
  vertexIndex?: number;
  original: MaskComponentData;
  base: MaskComponentData;
  current: MaskComponentData;
  grab?: Vec2;
}

export interface MaskDragHost {
  getApp(): Application | undefined;
  world: Container;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  previewMask(nodeId: string, mask: MaskComponentData): void;
  paintSelection(nodeId: string): void;
  onMaskResizeEnd?(nodeId: string, mask: MaskComponentData): void;
}

/**
 * Mask overlay-move, size-handle, and polygon-vertex drag.
 * Reuses HitZone geometry math. One gesture → one SetMaskCommand.
 */
export class PixiMaskDragController {
  private drag: MaskDragState | undefined;

  get isDragging(): boolean {
    return this.drag !== undefined;
  }

  isActiveFor(nodeId: string): boolean {
    return this.drag?.nodeId === nodeId;
  }

  beginMove(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
    host: MaskDragHost,
  ): void {
    const mask = effectiveMask(runtime);
    if (!mask) {
      return;
    }
    const zone = maskAsHitZone(mask);
    if (!zone) {
      return;
    }
    const local = event.getLocalPosition(runtime.visualsRoot);
    const offset = getHitZoneOffset(zone);
    this.begin(runtime, event, host, {
      kind: "move",
      original: structuredClone(mask),
      base: structuredClone(mask),
      grab: { x: local.x - offset.x, y: local.y - offset.y },
    });
  }

  beginHandle(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
    host: MaskDragHost,
  ): void {
    if (event.button === MOUSE_BUTTON_MIDDLE) {
      return;
    }
    const mask = effectiveMask(runtime);
    const zone = mask ? maskAsHitZone(mask) : undefined;
    if (!mask || !zone) {
      return;
    }
    if (handle.kind === "size") {
      const size = hitZoneShapeSize(zone.shape);
      if (!size) {
        return;
      }
      this.begin(runtime, event, host, {
        kind: "resize",
        handle: handle.handle,
        original: structuredClone(mask),
        base: structuredClone(mask),
      });
      return;
    }
    if (mask.mode !== "shape") {
      return;
    }
    if (handle.kind === "vertex") {
      if (event.button === MOUSE_BUTTON_SECONDARY) {
        this.commitRemovedVertex(runtime, mask, zone, handle.index, host);
        return;
      }
      this.begin(runtime, event, host, {
        kind: "vertex",
        vertexIndex: handle.index,
        original: structuredClone(mask),
        base: structuredClone(mask),
      });
      return;
    }
    if (event.button === MOUSE_BUTTON_SECONDARY) {
      return;
    }
    const insertedZone = {
      ...zone,
      shape: insertHitZonePolygonPointOnEdge(zone.shape, handle.index),
    };
    const inserted = mergeHitZoneIntoMask(mask, insertedZone);
    this.begin(runtime, event, host, {
      kind: "vertex",
      vertexIndex: handle.index + 1,
      original: structuredClone(mask),
      base: structuredClone(inserted),
      current: structuredClone(inserted),
    });
    host.previewMask(runtime.node.id, inserted);
  }

  private commitRemovedVertex(
    runtime: RuntimeNode,
    mask: MaskComponentData,
    zone: HitZoneComponentData,
    index: number,
    host: MaskDragHost,
  ): void {
    const nextShape = removeHitZonePolygonPoint(zone.shape, index);
    if (JSON.stringify(nextShape) === JSON.stringify(zone.shape)) {
      return;
    }
    host.onMaskResizeEnd?.(
      runtime.node.id,
      mergeHitZoneIntoMask(mask, { ...zone, shape: nextShape }),
    );
  }

  private begin(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
    host: MaskDragHost,
    init: Omit<MaskDragState, "nodeId" | "pointerId" | "current"> & {
      current?: MaskComponentData;
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
      const baseZone = maskAsHitZone(drag.base);
      if (!baseZone) {
        return;
      }
      if (drag.kind === "move") {
        const grab = drag.grab;
        if (!grab) {
          return;
        }
        drag.current = mergeHitZoneIntoMask(drag.base, {
          ...baseZone,
          offset: { x: local.x - grab.x, y: local.y - grab.y },
        });
      } else if (drag.kind === "vertex") {
        const index = drag.vertexIndex;
        if (index === undefined) {
          return;
        }
        const offset = getHitZoneOffset(baseZone);
        drag.current = mergeHitZoneIntoMask(drag.base, {
          ...baseZone,
          shape: setHitZonePolygonPoint(baseZone.shape, index, {
            x: local.x - offset.x,
            y: local.y - offset.y,
          }),
        });
      } else {
        drag.current = applyResizeMove(drag.base, baseZone, local, moveEvent.shiftKey, drag.handle);
      }
      host.previewMask(drag.nodeId, drag.current);
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
        live.maskPreview = undefined;
      }
      if (JSON.stringify(drag.original) !== JSON.stringify(drag.current)) {
        host.onMaskResizeEnd?.(drag.nodeId, drag.current);
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
  baseMask: MaskComponentData,
  baseZone: HitZoneComponentData,
  local: Vec2,
  shiftKey: boolean,
  handle: SpriteSizeHandle | undefined,
): MaskComponentData {
  const startSize = hitZoneShapeSize(baseZone.shape);
  if (!handle || !startSize) {
    return baseMask;
  }
  if (baseZone.shape.type === "circle") {
    const offset = getHitZoneOffset(baseZone);
    const nextSize = sizeFromHandleDrag(
      handle,
      local.x - offset.x,
      local.y - offset.y,
      startSize.width,
      startSize.height,
      { uniform: true, anchor: { x: 0.5, y: 0.5 } },
    );
    return mergeHitZoneIntoMask(baseMask, {
      ...baseZone,
      shape: applySizeToHitZoneShape(
        baseZone.shape,
        nextSize.width,
        nextSize.height,
      ),
    });
  }
  const nextSize = hitZoneSizeFromHandleDrag(
    handle,
    local.x,
    local.y,
    getHitZoneOffset(baseZone),
    startSize.width,
    startSize.height,
    { uniform: shiftKey },
  );
  return mergeHitZoneIntoMask(baseMask, {
    ...baseZone,
    offset: nextSize.offset,
    shape: applySizeToHitZoneShape(
      baseZone.shape,
      nextSize.width,
      nextSize.height,
    ),
  });
}

function mergeHitZoneIntoMask(
  mask: MaskComponentData,
  zone: HitZoneComponentData,
): MaskComponentData {
  const next: MaskComponentData = structuredClone(mask);
  if (zone.offset !== undefined && (zone.offset.x !== 0 || zone.offset.y !== 0)) {
    next.offset = { ...zone.offset };
  } else {
    delete next.offset;
  }
  if (mask.mode === "shape") {
    next.shape = zone.shape;
    return next;
  }
  if (zone.shape.type === "rectangle") {
    next.width = zone.shape.width;
    next.height = zone.shape.height;
  }
  return next;
}
