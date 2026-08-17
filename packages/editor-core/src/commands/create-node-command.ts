import type { Command } from "@game-editor/commands";
import {
  allocateNumberedName,
  collectNodeNames,
  DEFAULT_NODE_SPAWN_POSITION,
  findNodeById,
  nodeCanHaveChildren,
  type SceneNodeData,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";
import {
  ensureDefaultNodeTypesRegistered,
  resolveCreateParentId,
  type NodeTypeId,
  type NodeTypeRegistry,
} from "../node-types/index.js";

export interface CreateNodeOptions {
  typeId: NodeTypeId;
  name?: string;
  position?: Vec2;
  parentId?: string;
  assetId?: string;
  /**
   * When true (default), ignore explicit parentId and resolve from selection
   * using the create-parent policy. Pass `resolveParent: false` with parentId
   * for explicit placement (tests / hierarchy Create Child).
   */
  resolveParent?: boolean;
  registry?: NodeTypeRegistry;
  /** CSS family when creating Text from a webfont catalogue asset. */
  fontFamily?: string;
  tileWidth?: number;
  tileHeight?: number;
}

export class CreateNodeCommand implements Command {
  readonly name = "CreateNode";
  private readonly node: SceneNodeData;
  private readonly parentId: string | undefined;
  private readonly index: number;
  private readonly previousSelection: EditorSelection;
  private readonly typeId: NodeTypeId;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: CreateNodeOptions,
  ) {
    const registry =
      options.registry ?? ensureDefaultNodeTypesRegistered();
    const definition = registry.require(options.typeId);
    this.typeId = options.typeId;

    const scene = document.getScene();
    const resolveParent = options.resolveParent !== false;
    const parentId = resolveParent
      ? resolveCreateParentId(scene, selection.getPrimaryNodeId())
      : options.parentId;

    if (parentId !== undefined) {
      const parent = findNodeById(scene, parentId);
      if (!parent) {
        throw new Error(`CreateNodeCommand: unknown parent ${parentId}`);
      }
      if (!nodeCanHaveChildren(parent)) {
        throw new Error(
          `CreateNodeCommand: parent ${parentId} cannot have children`,
        );
      }
    }

    const name = allocateNumberedName(
      options.name ?? definition.label,
      collectNodeNames(scene),
    );

    this.parentId = parentId;
    this.node = definition.createDefaultNode({
      name,
      position: options.position ?? { ...DEFAULT_NODE_SPAWN_POSITION },
      ...(parentId !== undefined ? { parentId } : {}),
      ...(options.assetId !== undefined ? { assetId: options.assetId } : {}),
      ...(options.fontFamily !== undefined
        ? { fontFamily: options.fontFamily }
        : {}),
      ...(options.tileWidth !== undefined ? { tileWidth: options.tileWidth } : {}),
      ...(options.tileHeight !== undefined
        ? { tileHeight: options.tileHeight }
        : {}),
    });
    this.previousSelection = selection.getSelection();

    if (parentId !== undefined) {
      const parent = findNodeById(scene, parentId)!;
      this.index = parent.children.length;
    } else {
      this.index = scene.nodes.length;
    }
  }

  get createdNodeId(): string {
    return this.node.id;
  }

  get createdTypeId(): NodeTypeId {
    return this.typeId;
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
