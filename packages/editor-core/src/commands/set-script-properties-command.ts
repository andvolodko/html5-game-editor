import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  type ScriptComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Replaces Script.properties (and optionally merges patch keys).
 * One inspector field commit = one undo step.
 */
export class SetScriptPropertiesCommand implements Command {
  readonly name = "SetScriptProperties";
  private readonly before: ScriptComponentData;
  private readonly after: ScriptComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    componentId: string,
    propertiesPatch: Record<string, unknown>,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const component = node?.components.find((c) => c.id === componentId);
    if (!node || !component || component.type !== "Script") {
      throw new Error(
        `SetScriptPropertiesCommand: node ${nodeId} missing Script ${componentId}`,
      );
    }

    this.before = structuredClone(component);
    this.after = structuredClone(component);
    this.after.properties = {
      ...this.after.properties,
      ...structuredClone(propertiesPatch),
    };
  }

  execute(): void {
    this.document.applyScriptComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyScriptComponent(this.nodeId, this.before);
  }
}
