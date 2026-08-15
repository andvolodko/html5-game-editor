/**
 * Collects assetIds referenced by scene components and prefab instances.
 * Prefab documents are walked recursively when a catalog is provided.
 */

import type { SceneData, SceneNodeData } from "./types.js";
import type { PrefabCatalog, PrefabData } from "./prefab/types.js";

function addAssetId(ids: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.length > 0) {
    ids.add(value);
  }
}

export function collectNodeReferencedAssetIds(nodes: readonly SceneNodeData[]): string[] {
  const ids = new Set<string>();
  visitNodes(nodes, ids);
  return [...ids].sort();
}

export function collectReferencedAssetIds(
  scene: SceneData,
  prefabs?: PrefabCatalog,
): string[] {
  const ids = new Set<string>();
  const visitedPrefabs = new Set<string>();

  const visitPrefab = (assetId: string): void => {
    if (visitedPrefabs.has(assetId)) {
      return;
    }
    visitedPrefabs.add(assetId);
    const prefab = prefabs?.get(assetId);
    if (prefab === undefined) {
      return;
    }
    visitNodes([prefab.root], ids, visitPrefab);
  };

  visitNodes(scene.nodes, ids, visitPrefab);
  return [...ids].sort();
}

export function collectPrefabDocumentAssetIds(
  prefab: PrefabData,
  catalog?: PrefabCatalog,
): string[] {
  return collectReferencedAssetIds(
    {
      id: prefab.id,
      name: prefab.name,
      version: prefab.version,
      nodes: [prefab.root],
    },
    catalog,
  );
}

function visitNodes(
  nodes: readonly SceneNodeData[],
  ids: Set<string>,
  onPrefabAsset?: (assetId: string) => void,
): void {
  for (const node of nodes) {
    if (node.prefab) {
      addAssetId(ids, node.prefab.prefabAssetId);
      onPrefabAsset?.(node.prefab.prefabAssetId);
    }
    for (const component of node.components) {
      if ("assetId" in component) {
        addAssetId(ids, component.assetId);
      }
      if (
        (component.type === "Text" || component.type === "HTMLText") &&
        "style" in component
      ) {
        addAssetId(ids, component.style.fontAssetId);
      }
      if (component.type === "AnimatedSprite") {
        for (const frame of component.frames) {
          addAssetId(ids, frame);
        }
      }
    }
    visitNodes(node.children, ids, onPrefabAsset);
  }
}
