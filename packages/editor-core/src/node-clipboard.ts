import {
  findNodeById,
  getNodeLocation,
  normalizeRootMostNodeIds,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

export interface PasteLocation {
  parentId: string | undefined;
  index: number;
}

/**
 * In-memory copy buffer for scene nodes. Snapshots are JSON clones so paste
 * still works after the originals are deleted or a different scene is loaded.
 */
export class NodeClipboard {
  private snapshots: SceneNodeData[] = [];

  copyFromScene(scene: SceneData, selectedIds: readonly string[]): boolean {
    const roots = normalizeRootMostNodeIds(scene, selectedIds);
    const nodes: SceneNodeData[] = [];
    for (const id of roots) {
      const node = findNodeById(scene, id);
      if (node) {
        nodes.push(structuredClone(node));
      }
    }
    if (nodes.length === 0) {
      return false;
    }
    this.snapshots = nodes;
    return true;
  }

  hasContent(): boolean {
    return this.snapshots.length > 0;
  }

  templates(): readonly SceneNodeData[] {
    return this.snapshots;
  }
}

/** Paste as the next sibling of the primary selection, else at the scene root. */
export function resolvePasteLocation(
  scene: SceneData,
  primaryNodeId: string | undefined,
): PasteLocation {
  if (primaryNodeId) {
    const location = getNodeLocation(scene, primaryNodeId);
    if (location) {
      return { parentId: location.parentId, index: location.index + 1 };
    }
  }
  return { parentId: undefined, index: scene.nodes.length };
}
