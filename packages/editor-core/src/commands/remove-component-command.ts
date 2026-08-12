import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  type ScriptComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Removes a Script component by instance id. Transform/visuals are rejected.
 */
export class RemoveComponentCommand implements Command {
  readonly name = "RemoveComponent";
  private readonly removed: ScriptComponentData;
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
    if (!component || component.type !== "Script") {
      throw new Error(
        `RemoveComponentCommand: node ${nodeId} missing Script ${componentId}`,
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
