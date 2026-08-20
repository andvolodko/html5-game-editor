import type { Command } from "@game-editor/commands";
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
 * Removes a catalog state and strips that key from every node's stateOverrides.
 */
export class DeleteSceneStateCommand implements Command {
  readonly name = "DeleteSceneState";
  private readonly beforeCatalog: SceneStateDefinition[] | undefined;
  private readonly afterCatalog: SceneStateDefinition[] | undefined;
  private readonly beforeNodes: NodeOverridesSnapshot[];
  private readonly afterNodes: NodeOverridesSnapshot[];
  private readonly changed: boolean;

  constructor(
    private readonly document: DocumentManager,
    stateId: NodeStateId,
  ) {
    const scene = document.getScene();
    this.beforeCatalog =
      scene.states === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(scene.states)) as SceneStateDefinition[]);
    const catalogIndex =
      this.beforeCatalog?.findIndex((entry) => entry.id === stateId) ?? -1;
    if (catalogIndex < 0 || !this.beforeCatalog) {
      this.afterCatalog = this.beforeCatalog;
      this.beforeNodes = [];
      this.afterNodes = [];
      this.changed = false;
      return;
    }

    this.afterCatalog = this.beforeCatalog.filter((entry) => entry.id !== stateId);
    this.beforeNodes = [];
    this.afterNodes = [];

    for (const node of flattenNodes(scene)) {
      if (node.stateOverrides === undefined) {
        continue;
      }
      const before = JSON.parse(
        JSON.stringify(node.stateOverrides),
      ) as NodeStateOverridesMap;
      if (before[stateId] === undefined) {
        continue;
      }
      const after = { ...before };
      delete after[stateId];
      this.beforeNodes.push({
        nodeId: node.id,
        overrides: before,
      });
      this.afterNodes.push({
        nodeId: node.id,
        overrides: Object.keys(after).length > 0 ? after : undefined,
      });
    }
    this.changed = true;
  }

  execute(): void {
    if (!this.changed) {
      return;
    }
    this.document.setSceneStates(
      this.afterCatalog && this.afterCatalog.length > 0
        ? this.afterCatalog
        : undefined,
    );
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
