import type { Command } from "@game-editor/commands";
import {
  createMaskComponent,
  defaultMaskShapeForNode,
  findNodeById,
  getMask,
  getTransform2D,
  type MaskComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Adds a Mask on a Transform2D node. Rejects 3D-only nodes and duplicates.
 */
export class AddMaskCommand implements Command {
  readonly name = "AddMask";
  private readonly component: MaskComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`AddMaskCommand: unknown node ${nodeId}`);
    }
    if (!getTransform2D(node)) {
      throw new Error(`AddMaskCommand: node ${nodeId} has no Transform2D`);
    }
    if (getMask(node)) {
      throw new Error(`AddMaskCommand: Mask already on node ${nodeId}`);
    }
    this.component = createMaskComponent({
      shape: defaultMaskShapeForNode(node),
    });
  }

  get addedComponentId(): string {
    return this.component.id;
  }

  execute(): void {
    this.document.addComponent(this.nodeId, this.component);
  }

  undo(): void {
    this.document.removeComponent(this.nodeId, this.component.id);
  }
}
