/**
 * Collects assetIds referenced by scene components.
 * Enables future "which scenes reference asset X?" queries without a full graph yet.
 */

import type { SceneData, SceneNodeData } from "./types.js";

function addAssetId(ids: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.length > 0) {
    ids.add(value);
  }
}

export function collectReferencedAssetIds(scene: SceneData): string[] {
  const ids = new Set<string>();

  const visit = (nodes: SceneNodeData[]) => {
    for (const node of nodes) {
      for (const component of node.components) {
        if ("assetId" in component) {
          addAssetId(ids, component.assetId);
        }
        if (component.type === "AnimatedSprite") {
          for (const frame of component.frames) {
            addAssetId(ids, frame);
          }
        }
      }
      visit(node.children);
    }
  };

  visit(scene.nodes);
  return [...ids].sort();
}
