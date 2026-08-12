import {
  findNodeById,
  nodeCanHaveChildren,
  type SceneData,
} from "@game-editor/scene";

/**
 * Resolve where a newly created node should be inserted.
 *
 * Policy:
 * - selected node with canHaveChildren → create as child
 * - selected leaf → create as sibling under that node's parent (or root)
 * - no selection → create at scene root
 */
export function resolveCreateParentId(
  scene: SceneData,
  selectedNodeId: string | undefined,
): string | undefined {
  if (!selectedNodeId) {
    return undefined;
  }
  const selected = findNodeById(scene, selectedNodeId);
  if (!selected) {
    return undefined;
  }
  if (nodeCanHaveChildren(selected)) {
    return selected.id;
  }
  return selected.parentId;
}
