import { createId } from "@game-editor/shared";
import type { ComponentData, SceneData, SceneNodeData } from "./types.js";
import { createTransform2D } from "./factories.js";
import { findNodeById } from "./queries.js";
import { getNodeLocation, isAncestorOf } from "./hierarchy.js";

function cloneComponent(component: ComponentData): ComponentData {
  // Structured clone via JSON keeps nested plain data (arrays, vec2) without PIXI.
  const copy = JSON.parse(JSON.stringify(component)) as ComponentData;
  copy.id = createId("comp");
  return copy;
}

/** Deep-clone a node subtree with brand-new node/component IDs. Asset refs are kept. */
export function cloneNodeSubtree(source: SceneNodeData): SceneNodeData {
  const walk = (node: SceneNodeData, parentId: string | undefined): SceneNodeData => {
    const id = createId("node");
    const cloned: SceneNodeData = {
      id,
      name: node.name,
      components: node.components.map(cloneComponent),
      children: [],
    };
    if (parentId !== undefined) {
      cloned.parentId = parentId;
    }
    cloned.children = node.children.map((child) => walk(child, id));
    return cloned;
  };

  return walk(source, source.parentId);
}

/** Container-like node: Transform2D only (grouping). */
export function createContainerNode(
  name = "Container",
  parentId?: string,
): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [createTransform2D()],
    children: [],
  };
  if (parentId !== undefined) {
    node.parentId = parentId;
  }
  return node;
}

/**
 * Insert an existing node object (and its subtree) under parent at index.
 * Does not clone — used by create/duplicate/undo-delete.
 */
export function insertNodeInScene(
  scene: SceneData,
  node: SceneNodeData,
  parentId: string | undefined,
  index: number,
): void {
  if (findNodeById(scene, node.id)) {
    throw new Error(`insertNodeInScene: duplicate id ${node.id}`);
  }
  const siblings =
    parentId === undefined
      ? scene.nodes
      : findNodeById(scene, parentId)?.children;
  if (!siblings) {
    throw new Error(`insertNodeInScene: missing parent ${parentId}`);
  }
  if (parentId === undefined) {
    delete node.parentId;
  } else {
    node.parentId = parentId;
  }
  const clamped = Math.max(0, Math.min(index, siblings.length));
  siblings.splice(clamped, 0, node);
}

/** Detach node (subtree intact) from the scene. Returns former location. */
export function detachNodeFromScene(
  scene: SceneData,
  nodeId: string,
): { node: SceneNodeData; parentId: string | undefined; index: number } {
  const location = getNodeLocation(scene, nodeId);
  if (!location) {
    throw new Error(`detachNodeFromScene: unknown node ${nodeId}`);
  }
  const [node] = location.siblings.splice(location.index, 1);
  if (!node) {
    throw new Error(`detachNodeFromScene: failed to detach ${nodeId}`);
  }
  return {
    node,
    parentId: location.parentId,
    index: location.index,
  };
}

/** Root-most selected ids (drop descendants when an ancestor is also selected). */
export function normalizeRootMostNodeIds(
  scene: SceneData,
  nodeIds: readonly string[],
): string[] {
  const unique = [...new Set(nodeIds)].filter((id) => findNodeById(scene, id));
  return unique.filter(
    (id) => !unique.some((other) => other !== id && isAncestorOf(scene, other, id)),
  );
}

/**
 * After deleting `deletedId`, choose next selection among previous selection
 * that still exists, else sibling/parent fallback for the deleted node.
 */
export function selectionAfterDelete(
  scene: SceneData,
  deletedId: string,
  previousSelectedIds: readonly string[],
  deletedParentId: string | undefined,
  deletedIndex: number,
  deletedSiblingsSnapshot: readonly string[],
): string[] {
  const remaining = previousSelectedIds.filter(
    (id) => id !== deletedId && findNodeById(scene, id),
  );
  if (remaining.length > 0) {
    return remaining;
  }

  const siblings =
    deletedParentId === undefined
      ? scene.nodes
      : findNodeById(scene, deletedParentId)?.children ?? [];

  const nextId = deletedSiblingsSnapshot[deletedIndex + 1];
  if (nextId && siblings.some((n) => n.id === nextId)) {
    return [nextId];
  }
  const prevId = deletedSiblingsSnapshot[deletedIndex - 1];
  if (prevId && siblings.some((n) => n.id === prevId)) {
    return [prevId];
  }
  if (deletedParentId && findNodeById(scene, deletedParentId)) {
    return [deletedParentId];
  }
  return [];
}

export function allocateDuplicateName(
  baseName: string,
  existingNames: readonly string[],
): string {
  const copy = `${baseName} Copy`;
  if (!existingNames.includes(copy)) {
    return copy;
  }
  let n = 2;
  while (existingNames.includes(`${baseName} Copy ${String(n)}`)) {
    n += 1;
  }
  return `${baseName} Copy ${String(n)}`;
}

export function allocateNumberedName(
  baseName: string,
  existingNames: readonly string[],
): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }
  let n = 2;
  while (existingNames.includes(`${baseName} ${String(n)}`)) {
    n += 1;
  }
  return `${baseName} ${String(n)}`;
}

export function collectNodeNames(scene: SceneData): string[] {
  const names: string[] = [];
  const visit = (nodes: SceneNodeData[]) => {
    for (const node of nodes) {
      names.push(node.name);
      visit(node.children);
    }
  };
  visit(scene.nodes);
  return names;
}

/** Flatten a single subtree depth-first (includes root). */
export function flattenSubtree(node: SceneNodeData): SceneNodeData[] {
  const result: SceneNodeData[] = [node];
  for (const child of node.children) {
    result.push(...flattenSubtree(child));
  }
  return result;
}
