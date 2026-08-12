import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  type SceneNodeLayer,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/** Sets a 2D node's hybrid stack layer (background / foreground). */
export class SetNodeLayerCommand implements Command {
  readonly name = "SetNodeLayer";
  private readonly before: SceneNodeLayer | undefined;
  private readonly after: SceneNodeLayer;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    layer: SceneNodeLayer,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`SetNodeLayerCommand: unknown node ${nodeId}`);
    }
    this.before = node.layer;
    this.after = layer;
  }

  execute(): void {
    this.document.setNodeLayer(this.nodeId, this.after);
  }

  undo(): void {
    this.document.setNodeLayer(this.nodeId, this.before);
  }
}
