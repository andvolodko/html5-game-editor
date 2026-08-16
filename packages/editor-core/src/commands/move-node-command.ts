import type { Command } from "@game-editor/commands";
import {
  canMoveNode,
  decomposeAff2ToTransform2D,
  findNodeById,
  getNodeLocation,
  getParentWorldAff2,
  getTransform2D,
  getWorldAff2,
  invertAff2,
  multiplyAff2,
  type Transform2DComponentData,
} from "@game-editor/scene";
import { assertPrefabStructureEditAllowed } from "../prefab-structure.js";
import type { DocumentManager } from "../document-manager.js";
import { cloneTransform2D } from "./clone-transform-2d.js";

export interface MoveNodeCommandArgs {
  nodeId: string;
  toParentId: string | undefined;
  toIndex: number;
  /** When true (default), rewrite local Transform2D so world pose stays put. */
  preserveWorldTransform?: boolean;
}

/**
 * Reparent and/or reorder a node. One drag gesture → one command.
 * Undo restores exact previous parent, index, and local transform.
 */
export class MoveNodeCommand implements Command {
  readonly name = "MoveNode";
  private readonly nodeId: string;
  private readonly fromParentId: string | undefined;
  private readonly fromIndex: number;
  private readonly toParentId: string | undefined;
  private readonly toIndex: number;
  private readonly beforeTransform: Transform2DComponentData | undefined;
  private readonly afterTransform: Transform2DComponentData | undefined;

  constructor(
    private readonly document: DocumentManager,
    args: MoveNodeCommandArgs,
  ) {
    const scene = document.getScene();
    const location = getNodeLocation(scene, args.nodeId);
    if (!location) {
      throw new Error(`MoveNodeCommand: unknown node ${args.nodeId}`);
    }
    assertPrefabStructureEditAllowed(scene, args.nodeId);
    if (!canMoveNode(scene, args.nodeId, args.toParentId)) {
      throw new Error(
        `MoveNodeCommand: invalid move of ${args.nodeId} under ${args.toParentId ?? "root"}`,
      );
    }

    this.nodeId = args.nodeId;
    this.fromParentId = location.parentId;
    this.fromIndex = location.index;
    this.toParentId = args.toParentId;
    // args.toIndex is already post-detach (from resolveHierarchyDrop / callers).
    this.toIndex = args.toIndex;

    const node = findNodeById(scene, args.nodeId)!;
    const transform = getTransform2D(node);
    this.beforeTransform = transform ? cloneTransform2D(transform) : undefined;

    const preserve = args.preserveWorldTransform !== false;
    if (preserve && transform) {
      const worldAff = getWorldAff2(scene, args.nodeId);
      const parentWorld = getParentWorldAff2(scene, args.toParentId);
      const localAff = multiplyAff2(invertAff2(parentWorld), worldAff);
      this.afterTransform = decomposeAff2ToTransform2D(localAff, transform.id);
    } else {
      this.afterTransform = this.beforeTransform
        ? cloneTransform2D(this.beforeTransform)
        : undefined;
    }
  }

  execute(): void {
    this.document.moveNode(
      this.nodeId,
      this.toParentId,
      this.toIndex,
      this.afterTransform,
    );
  }

  undo(): void {
    // fromIndex is the desired final index in the restored sibling list.
    // With post-detach insertion semantics, that index is used directly.
    this.document.moveNode(
      this.nodeId,
      this.fromParentId,
      this.fromIndex,
      this.beforeTransform,
    );
  }
}
