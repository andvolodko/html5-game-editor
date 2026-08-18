import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  type HitZoneComponentData,
  type MaskComponentData,
  type ScriptComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

type RemovableComponent =
  | ScriptComponentData
  | HitZoneComponentData
  | MaskComponentData;

/**
 * Removes a Script, HitZone, or Mask component by instance id.
 * Transform / visual / Three leaves are rejected.
 */
export class RemoveComponentCommand implements Command {
  readonly name = "RemoveComponent";
  private readonly removed: RemovableComponent;
  private readonly index: number;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    componentId: string,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`RemoveComponentCommand: unknown node ${nodeId}`);
    }
    const index = node.components.findIndex((c) => c.id === componentId);
    const component = index >= 0 ? node.components[index] : undefined;
    if (
      !component ||
      (component.type !== "Script" &&
        component.type !== "HitZone" &&
        component.type !== "Mask")
    ) {
      throw new Error(
        `RemoveComponentCommand: node ${nodeId} missing removable component ${componentId}`,
      );
    }
    this.removed = structuredClone(component);
    this.index = index;
  }

  execute(): void {
    this.document.removeComponent(this.nodeId, this.removed.id);
  }

  undo(): void {
    this.document.addComponent(this.nodeId, this.removed, this.index);
  }
}
