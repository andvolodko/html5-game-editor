import {
  canMoveNode,
  findNodeById,
  flattenNodes,
  getNodeLocation,
  moveNodeInScene,
  normalizeRootMostNodeIds,
  type SceneData,
} from "@game-editor/scene";

export type HierarchyDropPlacement = "before" | "inside" | "after";

export interface HierarchyDropTarget {
  toParentId: string | undefined;
  /** Insertion index in the destination list after the node is detached. */
  toIndex: number;
}

/**
 * Resolve a hierarchy drop into a MoveNodeCommand destination.
 * Returns undefined when the move is invalid or a pure no-op.
 *
 * Indices are post-detachment (safe for `moveNodeInScene`).
 */
export function resolveHierarchyDrop(input: {
  scene: SceneData;
  draggedId: string;
  targetId?: string;
  placement: HierarchyDropPlacement | "root";
}): HierarchyDropTarget | undefined {
  const { scene, draggedId, targetId, placement } = input;
  const from = getNodeLocation(scene, draggedId);
  if (!from) {
    return undefined;
  }

  let toParentId: string | undefined;
  let rawIndex: number;

  if (placement === "root" || targetId === undefined) {
    toParentId = undefined;
    rawIndex = scene.nodes.length;
  } else {
    if (draggedId === targetId && placement === "inside") {
      return undefined;
    }
    const targetLocation = getNodeLocation(scene, targetId);
    if (!targetLocation) {
      return undefined;
    }

    if (placement === "inside") {
      const target = findNodeById(scene, targetId);
      if (!target) {
        return undefined;
      }
      toParentId = targetId;
      rawIndex = target.children.length;
    } else if (placement === "before") {
      toParentId = targetLocation.parentId;
      rawIndex = targetLocation.index;
    } else {
      toParentId = targetLocation.parentId;
      rawIndex = targetLocation.index + 1;
    }
  }

  if (!canMoveNode(scene, draggedId, toParentId)) {
    return undefined;
  }

  const toIndex = toPostDetachIndex(
    from.parentId,
    from.index,
    toParentId,
    rawIndex,
  );

  if (from.parentId === toParentId && from.index === toIndex) {
    return undefined;
  }

  return { toParentId, toIndex };
}

export interface HierarchyMultiMove {
  nodeId: string;
  toParentId: string | undefined;
  toIndex: number;
}

function dropDestinationParentId(input: {
  scene: SceneData;
  targetId?: string;
  placement: HierarchyDropPlacement | "root";
}): string | undefined {
  if (input.placement === "root" || input.targetId === undefined) {
    return undefined;
  }
  if (input.placement === "inside") {
    return input.targetId;
  }
  return getNodeLocation(input.scene, input.targetId)?.parentId;
}

/**
 * Resolve a multi-node hierarchy drop. Root-most ids only (parent+child → parent).
 * Nodes are applied in current tree order so sibling order is preserved.
 * Subsequent nodes stack after the previous dragged node.
 */
export function resolveHierarchyMultiDrop(input: {
  scene: SceneData;
  draggedIds: readonly string[];
  targetId?: string;
  placement: HierarchyDropPlacement | "root";
}): HierarchyMultiMove[] | undefined {
  const order = flattenNodes(input.scene).map((node) => node.id);
  const roots = normalizeRootMostNodeIds(input.scene, input.draggedIds).sort(
    (left, right) => order.indexOf(left) - order.indexOf(right),
  );
  if (roots.length === 0) {
    return undefined;
  }

  const working = structuredClone(input.scene) as SceneData;
  const moves: HierarchyMultiMove[] = [];
  let placement = input.placement;
  let targetId = input.targetId;

  for (const draggedId of roots) {
    if (targetId !== undefined && draggedId === targetId) {
      continue;
    }
    const destParentId = dropDestinationParentId({
      scene: working,
      targetId,
      placement,
    });
    if (!canMoveNode(working, draggedId, destParentId)) {
      continue;
    }
    const resolved =
      placement === "root" || targetId === undefined
        ? resolveHierarchyDrop({
            scene: working,
            draggedId,
            placement: "root",
          })
        : resolveHierarchyDrop({
            scene: working,
            draggedId,
            targetId,
            placement,
          });
    if (resolved) {
      moves.push({ nodeId: draggedId, ...resolved });
      moveNodeInScene(working, draggedId, resolved.toParentId, resolved.toIndex);
    }
    targetId = draggedId;
    placement = "after";
  }

  return moves.length > 0 ? moves : undefined;
}

/** Ids to drag: the whole selection when the grabbed node is selected. */
export function hierarchyDragNodeIds(
  grabbedId: string,
  selectedIds: readonly string[],
): string[] {
  if (selectedIds.includes(grabbedId)) {
    return [...selectedIds];
  }
  return [grabbedId];
}

/**
 * Convert a pre-detach destination index (as if the dragged node were still in
 * its old sibling list when same-parent) into a post-detach insertion index.
 */
export function toPostDetachIndex(
  fromParentId: string | undefined,
  fromIndex: number,
  toParentId: string | undefined,
  preDetachToIndex: number,
): number {
  if (fromParentId === toParentId && fromIndex < preDetachToIndex) {
    return Math.max(0, preDetachToIndex - 1);
  }
  return preDetachToIndex;
}

/** @deprecated use post-detach equality; kept for tests of band mapping only */
export function isNoOpMove(
  fromParentId: string | undefined,
  fromIndex: number,
  toParentId: string | undefined,
  toIndex: number,
): boolean {
  return fromParentId === toParentId && fromIndex === toIndex;
}

/** Top band of a hierarchy row maps to "before" placement. */
export const HIERARCHY_DROP_BEFORE_RATIO = 0.25;
/** Bottom band of a hierarchy row maps to "after" placement. */
export const HIERARCHY_DROP_AFTER_RATIO = 0.75;

/** Placement band from pointer Y within a row. */
export function placementFromRowOffset(
  offsetY: number,
  rowHeight: number,
): HierarchyDropPlacement {
  const y = Math.max(0, Math.min(offsetY, rowHeight));
  const t = rowHeight <= 0 ? 0.5 : y / rowHeight;
  if (t < HIERARCHY_DROP_BEFORE_RATIO) {
    return "before";
  }
  if (t > HIERARCHY_DROP_AFTER_RATIO) {
    return "after";
  }
  return "inside";
}
