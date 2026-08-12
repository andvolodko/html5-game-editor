import type { SceneData, SceneNodeData } from "./types.js";
import { nodeCanHaveChildren } from "./node-capabilities.js";
import { findNodeById } from "./queries.js";
import { canParentAcrossTransformSpace } from "./scene-layers.js";

export interface NodeLocation {
  /** `undefined` means the scene root list (`scene.nodes`). */
  parentId: string | undefined;
  index: number;
  siblings: SceneNodeData[];
}

export function getNodeLocation(
  scene: SceneData,
  nodeId: string,
): NodeLocation | undefined {
  const rootIndex = scene.nodes.findIndex((node) => node.id === nodeId);
  if (rootIndex >= 0) {
    return {
      parentId: undefined,
      index: rootIndex,
      siblings: scene.nodes,
    };
  }

  const stack: SceneNodeData[] = [...scene.nodes];
  while (stack.length > 0) {
    const parent = stack.pop();
    if (!parent) {
      continue;
    }
    const index = parent.children.findIndex((child) => child.id === nodeId);
    if (index >= 0) {
      return {
        parentId: parent.id,
        index,
        siblings: parent.children,
      };
    }
    stack.push(...parent.children);
  }
  return undefined;
}

export function findParentNode(
  scene: SceneData,
  nodeId: string,
): SceneNodeData | undefined {
  const location = getNodeLocation(scene, nodeId);
  if (!location?.parentId) {
    return undefined;
  }
  return findNodeById(scene, location.parentId);
}

/** True if `maybeAncestorId` is `nodeId` or an ancestor of `nodeId`. */
export function isAncestorOf(
  scene: SceneData,
  maybeAncestorId: string,
  nodeId: string,
): boolean {
  if (maybeAncestorId === nodeId) {
    return true;
  }
  let current = findParentNode(scene, nodeId);
  while (current) {
    if (current.id === maybeAncestorId) {
      return true;
    }
    current = findParentNode(scene, current.id);
  }
  return false;
}

export function canMoveNode(
  scene: SceneData,
  nodeId: string,
  toParentId: string | undefined,
): boolean {
  if (!findNodeById(scene, nodeId)) {
    return false;
  }
  if (toParentId === undefined) {
    return true;
  }
  if (toParentId === nodeId) {
    return false;
  }
  const parent = findNodeById(scene, toParentId);
  if (!parent) {
    return false;
  }
  // Leaf visuals (Sprite, Text, Mesh*, …) cannot accept scene children.
  if (!nodeCanHaveChildren(parent)) {
    return false;
  }
  // Pixi (2D) and Three (3D) hierarchies must not nest across transform spaces.
  const child = findNodeById(scene, nodeId);
  if (!child || !canParentAcrossTransformSpace(child, parent)) {
    return false;
  }
  // Cannot parent under a descendant (would cycle).
  return !isAncestorOf(scene, nodeId, toParentId);
}

export interface MoveNodeResult {
  node: SceneNodeData;
  fromParentId: string | undefined;
  fromIndex: number;
  toParentId: string | undefined;
  toIndex: number;
}

/**
 * Moves a node (and its subtree) to a new parent/index.
 * Updates `parentId`. Does not adjust transforms.
 */
export function moveNodeInScene(
  scene: SceneData,
  nodeId: string,
  toParentId: string | undefined,
  toIndex: number,
): MoveNodeResult {
  if (!canMoveNode(scene, nodeId, toParentId)) {
    throw new Error(
      `moveNodeInScene: invalid move of ${nodeId} under ${toParentId ?? "root"}`,
    );
  }

  const from = getNodeLocation(scene, nodeId);
  if (!from) {
    throw new Error(`moveNodeInScene: unknown node ${nodeId}`);
  }

  const [node] = from.siblings.splice(from.index, 1);
  if (!node) {
    throw new Error(`moveNodeInScene: failed to detach ${nodeId}`);
  }

  const targetSiblings =
    toParentId === undefined
      ? scene.nodes
      : findNodeById(scene, toParentId)?.children;

  if (!targetSiblings) {
    from.siblings.splice(from.index, 0, node);
    throw new Error(`moveNodeInScene: missing parent ${toParentId}`);
  }

  // `toIndex` is the insertion index in the destination list *after* detachment.
  const clamped = Math.max(0, Math.min(toIndex, targetSiblings.length));
  if (toParentId === undefined) {
    delete node.parentId;
  } else {
    node.parentId = toParentId;
  }
  targetSiblings.splice(clamped, 0, node);

  return {
    node,
    fromParentId: from.parentId,
    fromIndex: from.index,
    toParentId,
    toIndex: clamped,
  };
}

/** Collect ancestor ids from parent up to root (excludes the node itself). */
export function getAncestorIds(scene: SceneData, nodeId: string): string[] {
  const ids: string[] = [];
  let current = findParentNode(scene, nodeId);
  while (current) {
    ids.push(current.id);
    current = findParentNode(scene, current.id);
  }
  return ids;
}
