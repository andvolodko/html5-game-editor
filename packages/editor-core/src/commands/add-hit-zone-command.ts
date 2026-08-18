import type { Command } from "@game-editor/commands";
import {
  createHitZoneComponent,
  defaultHitZoneShapeForNode,
  findNodeById,
  getHitZone,
  getTransform2D,
  type HitZoneComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Adds a HitZone on a Transform2D node. Rejects 3D-only nodes and duplicates.
 */
export class AddHitZoneCommand implements Command {
  readonly name = "AddHitZone";
  private readonly component: HitZoneComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`AddHitZoneCommand: unknown node ${nodeId}`);
    }
    if (!getTransform2D(node)) {
      throw new Error(
        `AddHitZoneCommand: node ${nodeId} has no Transform2D`,
      );
    }
    if (getHitZone(node)) {
      throw new Error(`AddHitZoneCommand: HitZone already on node ${nodeId}`);
    }
    this.component = createHitZoneComponent({
      shape: defaultHitZoneShapeForNode(node),
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
