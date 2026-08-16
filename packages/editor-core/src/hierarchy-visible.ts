import type { SceneNodeData } from "@game-editor/scene";

/**
 * Depth-first ids of nodes currently shown in the Hierarchy tree.
 * Children are included only when their parent id is in `expanded`.
 */
export function flattenVisibleNodeIds(
  roots: readonly SceneNodeData[],
  expanded: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  const visit = (nodes: readonly SceneNodeData[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (expanded.has(node.id) && node.children.length > 0) {
        visit(node.children);
      }
    }
  };
  visit(roots);
  return ids;
}
