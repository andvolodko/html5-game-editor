import type { SceneNodeData } from "../types.js";
import { cloneSerializableNode } from "./clone.js";
import { instantiatePrefab } from "./instantiate.js";
import type { PrefabCatalog, PrefabResolveWarning } from "./types.js";
import { PREFAB_MAX_NESTING_DEPTH } from "./types.js";

/**
 * Expand nested prefab instances inside a prefab source tree using the catalog.
 * Cycle / depth problems become warnings; the existing node is kept.
 */
export function expandPrefabSourceTree(
  root: SceneNodeData,
  catalog: PrefabCatalog,
  warnings: PrefabResolveWarning[],
  visitedAssetIds: readonly string[] = [],
): SceneNodeData {
  const cloned = cloneSerializableNode(root);
  expandChildren(cloned, catalog, warnings, visitedAssetIds);
  return cloned;
}

function expandChildren(
  node: SceneNodeData,
  catalog: PrefabCatalog,
  warnings: PrefabResolveWarning[],
  visitedAssetIds: readonly string[],
): void {
  node.children = node.children.map((child) => {
    if (child.prefab?.isRoot === true) {
      return expandNestedInstance(child, catalog, warnings, visitedAssetIds);
    }
    expandChildren(child, catalog, warnings, visitedAssetIds);
    return child;
  });
}

function expandNestedInstance(
  instance: SceneNodeData,
  catalog: PrefabCatalog,
  warnings: PrefabResolveWarning[],
  visitedAssetIds: readonly string[],
): SceneNodeData {
  const assetId = instance.prefab?.prefabAssetId;
  if (assetId === undefined || instance.prefab === undefined) {
    return instance;
  }
  if (visitedAssetIds.includes(assetId)) {
    warnings.push({
      code: "PREFAB_CYCLE",
      prefabAssetId: assetId,
      message: `Prefab cycle: ${[...visitedAssetIds, assetId].join(" -> ")}`,
    });
    return instance;
  }
  if (visitedAssetIds.length >= PREFAB_MAX_NESTING_DEPTH) {
    warnings.push({
      code: "PREFAB_DEPTH",
      prefabAssetId: assetId,
      message: `Prefab nesting exceeded ${String(PREFAB_MAX_NESTING_DEPTH)} levels`,
    });
    return instance;
  }
  const prefab = catalog.get(assetId);
  if (prefab === undefined) {
    warnings.push({
      code: "MISSING_PREFAB",
      prefabAssetId: assetId,
      message: `Missing prefab asset ${assetId}`,
    });
    return instance;
  }
  const nextVisited = [...visitedAssetIds, assetId];
  const expandedRoot = expandPrefabSourceTree(
    prefab.root,
    catalog,
    warnings,
    nextVisited,
  );
  const { node } = instantiatePrefab(
    { ...prefab, root: expandedRoot },
    {
      prefabAssetId: assetId,
      instanceId: instance.prefab.instanceId,
      overrides: instance.prefab.overrides,
      parentId: instance.parentId,
    },
  );
  return node;
}
