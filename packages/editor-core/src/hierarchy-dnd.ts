import {
  canMoveNode,
  findNodeById,
  getNodeLocation,
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
