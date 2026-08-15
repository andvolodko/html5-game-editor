import type { Command } from "@game-editor/commands";
import {
  cloneSerializableNode,
  findNodeById,
  isPrefabInstanceRoot,
  resolvePrefabInstance,
  type PrefabCatalog,
  type PrefabData,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class RevertPrefabOverridesCommand implements Command {
  readonly name = "RevertPrefabOverrides";
  private readonly previous: SceneNodeData;
  private readonly next: SceneNodeData;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    nodeId: string,
    prefab: PrefabData,
    catalog: PrefabCatalog,
    options?: { overrideIndex?: number },
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node || !isPrefabInstanceRoot(node) || node.prefab === undefined) {
      throw new Error(
        `RevertPrefabOverridesCommand: node ${nodeId} is not a prefab instance root`,
      );
    }
    this.previous = cloneSerializableNode(node);
    const next = cloneSerializableNode(node);
    if (options?.overrideIndex !== undefined) {
      const overrides = [...(next.prefab?.overrides ?? [])];
      overrides.splice(options.overrideIndex, 1);
      if (next.prefab) {
        next.prefab.overrides = overrides.length > 0 ? overrides : undefined;
      }
    } else if (next.prefab) {
      delete next.prefab.overrides;
    }
    this.next = resolvePrefabInstance(prefab, next, catalog).node;
    this.previousSelection = selection.getSelection();
  }

  execute(): void {
    this.document.replaceNodeSubtree(this.previous.id, this.next);
    this.selection.setSelection([this.next.id]);
  }

  undo(): void {
    this.document.replaceNodeSubtree(this.next.id, this.previous);
    this.selection.restore(this.previousSelection);
  }
}
