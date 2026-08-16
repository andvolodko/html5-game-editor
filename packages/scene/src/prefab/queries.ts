import type { SceneData, SceneNodeData } from "../types.js";
import { findNodeById } from "../queries.js";
import { findParentNode } from "../hierarchy.js";
import type { PrefabInstanceLink, PrefabOverride } from "./types.js";

export function getPrefabLink(node: SceneNodeData): PrefabInstanceLink | undefined {
  return node.prefab;
}

export function isPrefabInstanceRoot(node: SceneNodeData): boolean {
  return node.prefab?.isRoot === true;
}

export function isInheritedPrefabNode(node: SceneNodeData): boolean {
  return node.prefab !== undefined && node.prefab.isRoot !== true;
}

export function isLocalPrefabChild(node: SceneNodeData): boolean {
  return node.prefab === undefined;
}

export function findPrefabInstanceRoot(
  scene: SceneData,
  nodeId: string,
): SceneNodeData | undefined {
  let current = findNodeById(scene, nodeId);
  while (current) {
    if (isPrefabInstanceRoot(current)) {
      return current;
    }
    if (current.prefab === undefined) {
      return undefined;
    }
    const parent = findParentNode(scene, current.id);
    if (!parent) {
      return undefined;
    }
    current = parent;
  }
  return undefined;
}

export function getPrefabInstanceOverrides(root: SceneNodeData): PrefabOverride[] {
  if (!isPrefabInstanceRoot(root) || root.prefab === undefined) {
    return [];
  }
  return root.prefab.overrides ?? [];
}

export function sourceComponentIdFor(
  node: SceneNodeData,
  sceneComponentId: string,
): string | undefined {
  return node.prefab?.componentSources[sceneComponentId];
}

export function sceneComponentIdForSource(
  node: SceneNodeData,
  sourceComponentId: string,
): string | undefined {
  if (node.prefab === undefined) {
    return undefined;
  }
  for (const [sceneId, sourceId] of Object.entries(node.prefab.componentSources)) {
    if (sourceId === sourceComponentId) {
      return sceneId;
    }
  }
  return undefined;
}

export function collectPrefabInstanceNodes(
  root: SceneNodeData,
): SceneNodeData[] {
  const instanceId = root.prefab?.instanceId;
  if (instanceId === undefined) {
    return [];
  }
  const nodes: SceneNodeData[] = [];
  const visit = (node: SceneNodeData): void => {
    if (node.prefab?.instanceId === instanceId) {
      nodes.push(node);
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return nodes;
}

export function findInstanceNodeBySourceId(
  root: SceneNodeData,
  sourceNodeId: string,
): SceneNodeData | undefined {
  const instanceId = root.prefab?.instanceId;
  if (instanceId === undefined) {
    return undefined;
  }
  const stack: SceneNodeData[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (node.prefab?.instanceId === instanceId && node.prefab.sourceNodeId === sourceNodeId) {
      return node;
    }
    stack.push(...node.children);
  }
  return undefined;
}

export function collectPrefabAssetIdsFromNodes(nodes: readonly SceneNodeData[]): string[] {
  const ids = new Set<string>();
  const visit = (list: readonly SceneNodeData[]): void => {
    for (const node of list) {
      if (node.prefab) {
        ids.add(node.prefab.prefabAssetId);
      }
      visit(node.children);
    }
  };
  visit(nodes);
  return [...ids].sort();
}
