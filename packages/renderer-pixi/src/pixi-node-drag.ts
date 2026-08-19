import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { getTransform2D, getVisualComponent, type Vec2 } from "@game-editor/scene";
import {
  MOUSE_BUTTON_MIDDLE,
  MOUSE_BUTTON_SECONDARY,
  viewportPointerModifiersFrom,
  type ViewportPointerModifiers,
} from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { POINTER_CLICK_MAX_MOVE_PX } from "./pixi-pointer-constants.js";
import { snapPositionToGrid } from "./snap-to-grid.js";
import type { NodePositionDrag } from "./pixi-scene-renderer-types.js";
import {
  captureFrozenParentSpace,
  collectGroupDragMemberIds,
  localAfterWorldDelta,
  applyMatrixInversePoint,
  applyMatrixPoint,
  screenToWorld,
  type FrozenParentSpace,
} from "./pixi-group-drag.js";

interface DragMember {
  nodeId: string;
  startPosition: Vec2;
  currentPosition: Vec2;
  space: FrozenParentSpace;
}

interface DragState {
  nodeId: string;
  pointerId: number;
  startPosition: Vec2;
  currentPosition: Vec2;
  startGlobalX: number;
  startGlobalY: number;
  startPointerWorld: Vec2;
  grabbedSpace: FrozenParentSpace;
  members: DragMember[];
}

export interface NodeDragHost {
  getApp(): Application | undefined;
  world: Container;
  isGizmoDragging(): boolean;
  getRuntime(nodeId: string): RuntimeNode | undefined;
  /** When set and positive, node-move positions are quantized to this world size. */
  getSnapGridSize?(): number | undefined;
  getSelectedNodeIds?(): ReadonlySet<string> | readonly string[];
  previewNodePosition(nodeId: string, position: Vec2): void;
  pickNodeId?(clientX: number, clientY: number): string | undefined;
  onNodePointerDown?(
    nodeId: string,
    world: Vec2,
    modifiers?: ViewportPointerModifiers,
  ): void;
  onNodePointerMove?(nodeId: string, world: Vec2): void;
  onNodePointerUp?(moves: readonly NodePositionDrag[]): void;
}

/**
 * Node-move pointer drag. One interaction → one command on pointerup (host).
 * Dragging an already-selected node translates the whole (root-most) selection.
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
      const modifiers = viewportPointerModifiersFrom(event);
      host.onNodePointerDown?.(
        live.node.id,
        {
          x: local.x,
          y: local.y,
        },
        modifiers,
      );

      if (!transform || live.editorLocked) {
        return;
      }

      if (event.button === MOUSE_BUTTON_SECONDARY) {
        return;
      }

      // Ctrl/Cmd-click toggles selection; do not start a move.
      if (modifiers.ctrlKey || modifiers.metaKey) {
        return;
      }

      const startLocal = { ...transform.position };
      const grabbedSpace = captureFrozenParentSpace(
        host.world,
        parentSpace,
        startLocal,
      );
      this.drag = {
        nodeId: live.node.id,
        pointerId: event.pointerId,
        startPosition: startLocal,
        currentPosition: startLocal,
        startGlobalX: event.global.x,
        startGlobalY: event.global.y,
        startPointerWorld: screenToWorld(host.world, {
          x: event.global.x,
          y: event.global.y,
        }),
        grabbedSpace,
        members: collectDragMembers(host, live.node.id),
      };
      live.container.cursor = "grabbing";

      const onMove = (moveEvent: FederatedPointerEvent) => {
        if (!this.drag || moveEvent.pointerId !== this.drag.pointerId) {
          return;
        }
        const pointerWorld = screenToWorld(host.world, {
          x: moveEvent.global.x,
          y: moveEvent.global.y,
        });
        const pointerDelta = {
          x: pointerWorld.x - this.drag.startPointerWorld.x,
          y: pointerWorld.y - this.drag.startPointerWorld.y,
        };
        const unsnappedEnd = {
          x: this.drag.grabbedSpace.startWorld.x + pointerDelta.x,
          y: this.drag.grabbedSpace.startWorld.y + pointerDelta.y,
        };
        let leaderLocal = applyMatrixInversePoint(
          this.drag.grabbedSpace.parentToWorld,
          unsnappedEnd,
        );
        const gridSize = host.getSnapGridSize?.();
        if (gridSize !== undefined && gridSize > 0) {
          leaderLocal = snapPositionToGrid(leaderLocal, gridSize);
        }
        this.drag.currentPosition = leaderLocal;
        previewGroupDrag(host, this.drag, leaderLocal);
        host.onNodePointerMove?.(this.drag.nodeId, leaderLocal);
      };

      const onUp = (upEvent: FederatedPointerEvent) => {
        if (!this.drag || upEvent.pointerId !== this.drag.pointerId) {
          return;
        }
        const finished = this.drag;
        this.drag = undefined;
        live.container.cursor = "grab";
        appOff();
        if (
          shouldSelectDescendantOnClick(
            host,
            finished,
            upEvent.global.x,
            upEvent.global.y,
          )
        ) {
          revertGroupDrag(host, finished);
          const picked = host.pickNodeId?.(upEvent.clientX, upEvent.clientY);
          if (
            picked &&
            picked !== finished.nodeId &&
            isNodeDescendant(host, picked, finished.nodeId)
          ) {
            host.onNodePointerDown?.(picked, {
              x: upEvent.global.x,
              y: upEvent.global.y,
            });
          }
          return;
        }
        host.onNodePointerUp?.(
          finished.members.map((member) => ({
            nodeId: member.nodeId,
            start: member.startPosition,
            end: member.currentPosition,
          })),
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

function collectDragMembers(host: NodeDragHost, grabbedId: string): DragMember[] {
  const selected = host.getSelectedNodeIds?.() ?? [];
  const selectedIds = [...selected];
  const memberIds = collectGroupDragMemberIds({
    grabbedId,
    selectedIds,
    getParentId: (id) => host.getRuntime(id)?.node.parentId,
    canMove: (id) => {
      const runtime = host.getRuntime(id);
      return Boolean(
        runtime && !runtime.editorLocked && getTransform2D(runtime.node),
      );
    },
  });
  const members: DragMember[] = [];
  for (const id of memberIds) {
    const member = createDragMember(host, id);
    if (member) {
      members.push(member);
    }
  }
  if (members.length > 0) {
    return members;
  }
  const grabbed = createDragMember(host, grabbedId);
  return grabbed ? [grabbed] : [];
}

function createDragMember(
  host: NodeDragHost,
  nodeId: string,
): DragMember | undefined {
  const runtime = host.getRuntime(nodeId);
  const transform = runtime ? getTransform2D(runtime.node) : undefined;
  if (!runtime || !transform) {
    return undefined;
  }
  const startPosition = { ...transform.position };
  return {
    nodeId,
    startPosition,
    currentPosition: { ...startPosition },
    space: captureFrozenParentSpace(
      host.world,
      runtime.container.parent ?? host.world,
      startPosition,
    ),
  };
}

function previewGroupDrag(
  host: NodeDragHost,
  drag: DragState,
  leaderLocal: Vec2,
): void {
  const leaderWorld = applyMatrixPoint(drag.grabbedSpace.parentToWorld, leaderLocal);
  const worldDelta = {
    x: leaderWorld.x - drag.grabbedSpace.startWorld.x,
    y: leaderWorld.y - drag.grabbedSpace.startWorld.y,
  };
  for (const member of drag.members) {
    const next =
      member.nodeId === drag.nodeId
        ? leaderLocal
        : localAfterWorldDelta(member.space, worldDelta);
    member.currentPosition = next;
    host.previewNodePosition(member.nodeId, next);
  }
}

function revertGroupDrag(host: NodeDragHost, drag: DragState): void {
  for (const member of drag.members) {
    member.currentPosition = member.startPosition;
    host.previewNodePosition(member.nodeId, member.startPosition);
  }
  if (!drag.members.some((member) => member.nodeId === drag.nodeId)) {
    host.previewNodePosition(drag.nodeId, drag.startPosition);
  }
}

function shouldSelectDescendantOnClick(
  host: NodeDragHost,
  drag: DragState,
  globalX: number,
  globalY: number,
): boolean {
  const runtime = host.getRuntime(drag.nodeId);
  if (!runtime || getVisualComponent(runtime.node)) {
    return false;
  }
  const dx = globalX - drag.startGlobalX;
  const dy = globalY - drag.startGlobalY;
  return dx * dx + dy * dy <= POINTER_CLICK_MAX_MOVE_PX * POINTER_CLICK_MAX_MOVE_PX;
}

function isNodeDescendant(
  host: NodeDragHost,
  nodeId: string,
  ancestorId: string,
): boolean {
  let currentId: string | undefined = host.getRuntime(nodeId)?.node.parentId;
  while (currentId) {
    if (currentId === ancestorId) {
      return true;
    }
    currentId = host.getRuntime(currentId)?.node.parentId;
  }
  return false;
}
