import type { SceneNodeData } from "@game-editor/scene";

/**
 * Depth-first ids of nodes currently shown in the Hierarchy tree.
 * Children are included only when their parent id is in `expanded`.
 * When `includeIds` is set, nodes outside that set are omitted.
 */
export function flattenVisibleNodeIds(
  roots: readonly SceneNodeData[],
  expanded: ReadonlySet<string>,
  includeIds?: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  const visit = (nodes: readonly SceneNodeData[]) => {
    for (const node of nodes) {
      if (includeIds !== undefined && !includeIds.has(node.id)) {
        continue;
      }
      ids.push(node.id);
      if (expanded.has(node.id) && node.children.length > 0) {
        visit(node.children);
      }
    }
  };
  visit(roots);
  return ids;
}

/** True when the Hierarchy search box has a usable query. */
export function isHierarchySearching(query: string): boolean {
  return query.trim().length > 0;
}

export function hierarchyQueryMatchesName(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return true;
  }
  return name.toLowerCase().includes(q);
}

/**
 * Node ids that remain in the tree while searching: name matches and
 * ancestors of matches, so the path to each hit stays visible.
 */
export function hierarchySearchVisibleIds(
  roots: readonly SceneNodeData[],
  query: string,
): Set<string> {
  const visible = new Set<string>();
  if (!isHierarchySearching(query)) {
    return visible;
  }
  const visit = (nodes: readonly SceneNodeData[]): boolean => {
    let matched = false;
    for (const node of nodes) {
      const selfMatch = hierarchyQueryMatchesName(node.name, query);
      const childMatch = visit(node.children);
      if (selfMatch || childMatch) {
        visible.add(node.id);
        matched = true;
      }
    }
    return matched;
  };
  visit(roots);
  return visible;
}

/** Parents that must stay expanded so search hits remain reachable. */
export function hierarchySearchExpandIds(
  roots: readonly SceneNodeData[],
  visibleIds: ReadonlySet<string>,
): Set<string> {
  const expand = new Set<string>();
  const visit = (nodes: readonly SceneNodeData[]) => {
    for (const node of nodes) {
      if (!visibleIds.has(node.id)) {
        continue;
      }
      if (node.children.some((child) => visibleIds.has(child.id))) {
        expand.add(node.id);
      }
      visit(node.children);
    }
  };
  visit(roots);
  return expand;
}
