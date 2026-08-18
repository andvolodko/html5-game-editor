import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  getGraphics,
  insertHitZonePolygonPointOnEdge,
  removeHitZonePolygonPoint,
  setHitZonePolygonPoint,
  type GraphicsShapeData,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_SECONDARY } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import type { HitZoneGizmoHandle } from "./pixi-hit-zone-gizmo.js";

interface GraphicsPolygonDragState {
  nodeId: string;
  pointerId: number;
  vertexIndex: number;
  original: GraphicsShapeData;
  base: GraphicsShapeData;
  current: GraphicsShapeData;
}

export interface GraphicsPolygonDragHost {
  getApp(): Application | undefined;
  world: Container;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  previewGraphicsShape(nodeId: string, shape: GraphicsShapeData): void;
  paintSelection(nodeId: string): void;
  onGraphicsPolygonEnd?(nodeId: string, shape: GraphicsShapeData): void;
}

/**
 * Graphics polygon vertex / edge-insert drag.
 * Points are node-local (no Mask/HitZone offset). One gesture → one command.
 */
export class PixiGraphicsPolygonDragController {
  private drag: GraphicsPolygonDragState | undefined;

  get isDragging(): boolean {
    return this.drag !== undefined;
  }

  isActiveFor(nodeId: string): boolean {
    return this.drag?.nodeId === nodeId;
  }

  beginHandle(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
    host: GraphicsPolygonDragHost,
  ): void {
    if (event.button === MOUSE_BUTTON_MIDDLE) {
      return;
    }
    const shape = sceneGraphicsPolygon(runtime);
    if (!shape || handle.kind === "size") {
      return;
    }
    if (handle.kind === "vertex") {
      if (event.button === MOUSE_BUTTON_SECONDARY) {
        this.commitRemovedVertex(runtime, shape, handle.index, host);
        return;
      }
      this.begin(runtime, event, host, {
        vertexIndex: handle.index,
        original: structuredClone(shape),
        base: structuredClone(shape),
      });
      return;
    }
    if (event.button === MOUSE_BUTTON_SECONDARY) {
      return;
    }
    const inserted = insertHitZonePolygonPointOnEdge(shape, handle.index);
    this.begin(runtime, event, host, {
      vertexIndex: handle.index + 1,
      original: structuredClone(shape),
      base: structuredClone(inserted),
      current: structuredClone(inserted),
    });
    host.previewGraphicsShape(runtime.node.id, inserted);
  }

  private commitRemovedVertex(
    runtime: RuntimeNode,
    shape: GraphicsShapeData,
    index: number,
    host: GraphicsPolygonDragHost,
  ): void {
    const next = removeHitZonePolygonPoint(shape, index);
    if (JSON.stringify(next) === JSON.stringify(shape)) {
      return;
    }
    host.onGraphicsPolygonEnd?.(runtime.node.id, next);
  }

  private begin(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
    host: GraphicsPolygonDragHost,
    init: Omit<GraphicsPolygonDragState, "nodeId" | "pointerId" | "current"> & {
      current?: GraphicsShapeData;
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
      vertexIndex: init.vertexIndex,
      original: init.original,
      base: init.base,
      current: init.current ?? structuredClone(init.base),
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
      drag.current = setHitZonePolygonPoint(drag.base, drag.vertexIndex, {
        x: local.x,
        y: local.y,
      });
      host.previewGraphicsShape(drag.nodeId, drag.current);
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
        live.graphicsShapePreview = undefined;
      }
      if (JSON.stringify(drag.original) !== JSON.stringify(drag.current)) {
        host.onGraphicsPolygonEnd?.(drag.nodeId, drag.current);
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

export function sceneGraphicsPolygon(
  runtime: RuntimeNode,
): Extract<GraphicsShapeData, { type: "polygon" }> | undefined {
  const preview = runtime.graphicsShapePreview;
  if (preview?.type === "polygon") {
    return preview;
  }
  const graphics = getGraphics(runtime.node);
  if (graphics?.shape.type === "polygon") {
    return graphics.shape;
  }
  return undefined;
}
