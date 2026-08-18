import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  setScriptEnabledField,
  type ScriptComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Toggles Script.enabled (omit when true). One Inspector checkbox = one undo step.
 */
export class SetScriptEnabledCommand implements Command {
  readonly name = "SetScriptEnabled";
  private readonly before: ScriptComponentData;
  private readonly after: ScriptComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    componentId: string,
    enabled: boolean,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const component = node?.components.find((c) => c.id === componentId);
    if (!node || !component || component.type !== "Script") {
      throw new Error(
        `SetScriptEnabledCommand: node ${nodeId} missing Script ${componentId}`,
      );
    }

    this.before = structuredClone(component);
    this.after = structuredClone(component);
    setScriptEnabledField(this.after, enabled);
  }

  execute(): void {
    this.document.applyScriptComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyScriptComponent(this.nodeId, this.before);
  }
}
