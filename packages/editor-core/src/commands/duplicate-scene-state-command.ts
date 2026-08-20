import type { Command } from "@game-editor/commands";
import { createId } from "@game-editor/shared";
import {
  flattenNodes,
  type NodeStateId,
  type NodeStateOverridesMap,
  type SceneStateDefinition,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

interface NodeOverridesSnapshot {
  nodeId: string;
  overrides: NodeStateOverridesMap | undefined;
}

/**
 * Duplicates a catalog state (new id + " Copy" name) and copies per-node overrides.
 */
export class DuplicateSceneStateCommand implements Command {
  readonly name = "DuplicateSceneState";
  private readonly beforeCatalog: SceneStateDefinition[] | undefined;
  private readonly afterCatalog: SceneStateDefinition[];
  private readonly beforeNodes: NodeOverridesSnapshot[];
  private readonly afterNodes: NodeOverridesSnapshot[];
  private readonly changed: boolean;
  readonly createdStateId: string;

  constructor(
    private readonly document: DocumentManager,
    sourceStateId: NodeStateId,
  ) {
    const scene = document.getScene();
    this.beforeCatalog =
      scene.states === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(scene.states)) as SceneStateDefinition[]);
    const source = this.beforeCatalog?.find((entry) => entry.id === sourceStateId);
    if (!source || !this.beforeCatalog) {
      this.createdStateId = "";
      this.afterCatalog = this.beforeCatalog ?? [];
      this.beforeNodes = [];
      this.afterNodes = [];
      this.changed = false;
      return;
    }

    this.createdStateId = createId("state");
    const duplicate: SceneStateDefinition = {
      id: this.createdStateId,
      name: `${source.name} Copy`,
    };
    if (source.viewport !== undefined) {
      duplicate.viewport = { ...source.viewport };
    }
    this.afterCatalog = [...this.beforeCatalog, duplicate];
    this.beforeNodes = [];
    this.afterNodes = [];

    for (const node of flattenNodes(scene)) {
      const sourceOverrides = node.stateOverrides?.[sourceStateId];
      if (sourceOverrides === undefined) {
        continue;
      }
      const before =
        node.stateOverrides === undefined
          ? undefined
          : (JSON.parse(
              JSON.stringify(node.stateOverrides),
            ) as NodeStateOverridesMap);
      const after: NodeStateOverridesMap = {
        ...(before ?? {}),
        [this.createdStateId]: JSON.parse(
          JSON.stringify(sourceOverrides),
        ) as NodeStateOverridesMap[string],
      };
      this.beforeNodes.push({ nodeId: node.id, overrides: before });
      this.afterNodes.push({ nodeId: node.id, overrides: after });
    }
    this.changed = true;
  }

  execute(): void {
    if (!this.changed) {
      return;
    }
    this.document.setSceneStates(this.afterCatalog);
    for (const entry of this.afterNodes) {
      this.document.replaceNodeStateOverridesMap(entry.nodeId, entry.overrides);
    }
  }

  undo(): void {
    if (!this.changed) {
      return;
    }
    this.document.setSceneStates(this.beforeCatalog);
    for (const entry of this.beforeNodes) {
      this.document.replaceNodeStateOverridesMap(entry.nodeId, entry.overrides);
    }
  }
}
