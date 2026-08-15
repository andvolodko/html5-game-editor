import type { Command } from "@game-editor/commands";
import {
  allocateNumberedName,
  collectNodeNames,
  findNodeById,
  instantiatePrefabResolved,
  nodeCanHaveChildren,
  type PrefabCatalog,
  type PrefabData,
  type SceneNodeData,
  type Vec2,
  type Vec3,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export interface InstantiatePrefabCommandOptions {
  prefab: PrefabData;
  prefabAssetId: string;
  parentId?: string;
  index?: number;
  position2D?: Vec2;
  position3D?: Vec3;
  catalog?: PrefabCatalog;
}

export class InstantiatePrefabCommand implements Command {
  readonly name = "InstantiatePrefab";
  readonly createdNodeId: string;
  private readonly node: SceneNodeData;
  private readonly parentId: string | undefined;
  private readonly index: number;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: InstantiatePrefabCommandOptions,
  ) {
    const scene = document.getScene();
    if (options.parentId !== undefined) {
      const parent = findNodeById(scene, options.parentId);
      if (parent && !nodeCanHaveChildren(parent)) {
        throw new Error(
          `InstantiatePrefabCommand: parent ${options.parentId} cannot have children`,
        );
      }
    }
    const resolved = instantiatePrefabResolved(options.prefab, {
      prefabAssetId: options.prefabAssetId,
      parentId: options.parentId,
      position2D: options.position2D,
      position3D: options.position3D,
      catalog: options.catalog,
    });
    resolved.node.name = allocateNumberedName(
      resolved.node.name,
      collectNodeNames(scene),
    );
    this.node = resolved.node;
    this.createdNodeId = resolved.node.id;
    this.parentId = options.parentId;
    this.index = options.index ?? Number.MAX_SAFE_INTEGER;
    this.previousSelection = selection.getSelection();
  }

  execute(): void {
    this.document.insertNode(this.node, this.parentId, this.index);
    this.selection.setSelection([this.node.id]);
  }

  undo(): void {
    this.document.removeNode(this.node.id);
    this.selection.restore(this.previousSelection);
  }
}
