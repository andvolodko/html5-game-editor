import type { Command } from "@game-editor/commands";
import {
  cloneSerializableNode,
  flattenNodes,
  isPrefabInstanceRoot,
  resolvePrefabInstance,
  type PrefabCatalog,
  type PrefabData,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

interface InstanceSwap {
  previous: SceneNodeData;
  next: SceneNodeData;
}

export class RefreshPrefabInstancesCommand implements Command {
  readonly name = "RefreshPrefabInstances";
  private readonly swaps: InstanceSwap[];

  constructor(
    private readonly document: DocumentManager,
    prefabAssetId: string,
    prefab: PrefabData,
    catalog: PrefabCatalog,
  ) {
    this.swaps = flattenNodes(document.getScene())
      .filter(
        (node) =>
          isPrefabInstanceRoot(node) && node.prefab?.prefabAssetId === prefabAssetId,
      )
      .map((node) => ({
        previous: cloneSerializableNode(node),
        next: resolvePrefabInstance(prefab, node, catalog).node,
      }));
  }

  execute(): void {
    for (const swap of this.swaps) {
      this.document.replaceNodeSubtree(swap.previous.id, swap.next);
    }
  }

  undo(): void {
    for (let index = this.swaps.length - 1; index >= 0; index -= 1) {
      const swap = this.swaps[index];
      if (swap) {
        this.document.replaceNodeSubtree(swap.next.id, swap.previous);
      }
    }
  }
}
