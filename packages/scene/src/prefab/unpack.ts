import type { SceneNodeData } from "../types.js";
import { cloneSerializableNode } from "./clone.js";

/**
 * Remove prefab relationship for one instance, keeping current nodes/components.
 * Nested prefab instances keep their own links.
 */
export function unpackPrefabInstance(root: SceneNodeData): SceneNodeData {
  const instanceId = root.prefab?.instanceId;
  const cloned = cloneSerializableNode(root);
  if (instanceId === undefined) {
    return cloned;
  }
  const visit = (node: SceneNodeData): void => {
    if (node.prefab?.instanceId === instanceId) {
      delete node.prefab;
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(cloned);
  return cloned;
}
