import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { getTransform2D, type Vec2 } from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_SECONDARY } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { snapPositionToGrid } from "./snap-to-grid.js";

interface DragState {
  nodeId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startPosition: Vec2;
  currentPosition: Vec2;
}

export interface NodeDragHost {
  getApp(): Application | undefined;
  world: Container;
  isGizmoDragging(): boolean;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  /** When set and positive, node-move positions are quantized to this world size. */
  getSnapGridSize?(): number | undefined;
  previewNodePosition(nodeId: string, position: Vec2): void;
  onNodePointerDown?(nodeId: string, world: Vec2): void;
  onNodePointerMove?(nodeId: string, world: Vec2): void;
  onNodePointerUp?(nodeId: string, start: Vec2, end: Vec2): void;
}

/**
 * Node-move pointer drag. One interaction → one command on pointerup (host).
 */
export class PixiNodeDragController {
  private drag: DragState | undefined;

  get active(): DragState | undefined {
    return this.drag;
  }

  isActiveFor(nodeId: string): boolean {
    return this.drag?.nodeId === nodeId;
  }

  attach(runtime: RuntimeNode, host: NodeDragHost): void {
    const nodeId = runtime.node.id;
    runtime.container.on("pointerdown", (event: FederatedPointerEvent) => {
      // Middle mouse is reserved for viewport pan.
      if (event.button === MOUSE_BUTTON_MIDDLE) {
        return;
      }
      event.stopPropagation();
      const live = host.getRuntime(nodeId);
      if (!live || host.isGizmoDragging()) {
        return;
      }

      const transform = getTransform2D(live.node);
      const parentSpace = live.container.parent ?? host.world;
      const local = event.getLocalPosition(parentSpace);
      host.onNodePointerDown?.(live.node.id, {
        x: local.x,
        y: local.y,
      });

      if (!transform) {
        return;
      }

      if (event.button === MOUSE_BUTTON_SECONDARY) {
        return;
      }

      this.drag = {
        nodeId: live.node.id,
        pointerId: event.pointerId,
        offsetX: local.x - transform.position.x,
        offsetY: local.y - transform.position.y,
        startPosition: { ...transform.position },
        currentPosition: { ...transform.position },
      };
      live.container.cursor = "grabbing";

      const onMove = (moveEvent: FederatedPointerEvent) => {
        if (!this.drag || moveEvent.pointerId !== this.drag.pointerId) {
          return;
        }
        const parent = live.container.parent ?? host.world;
        const point = moveEvent.getLocalPosition(parent);
        const raw = {
          x: point.x - this.drag.offsetX,
          y: point.y - this.drag.offsetY,
        };
        const gridSize = host.getSnapGridSize?.();
        const next =
          gridSize !== undefined && gridSize > 0
            ? snapPositionToGrid(raw, gridSize)
            : raw;
        this.drag.currentPosition = next;
        host.previewNodePosition(this.drag.nodeId, next);
        host.onNodePointerMove?.(this.drag.nodeId, next);
      };

      const onUp = (upEvent: FederatedPointerEvent) => {
        if (!this.drag || upEvent.pointerId !== this.drag.pointerId) {
          return;
        }
        const finished = this.drag;
        this.drag = undefined;
        live.container.cursor = "grab";
        appOff();
        host.onNodePointerUp?.(
          finished.nodeId,
          finished.startPosition,
          finished.currentPosition,
        );
      };

      const app = host.getApp();
      if (!app) {
        return;
      }

      const appOff = () => {
        app.stage.off("pointermove", onMove);
        app.stage.off("pointerup", onUp);
        app.stage.off("pointerupoutside", onUp);
      };

      app.stage.on("pointermove", onMove);
      app.stage.on("pointerup", onUp);
      app.stage.on("pointerupoutside", onUp);
    });
  }
}
