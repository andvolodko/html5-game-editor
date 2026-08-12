import type { Command } from "@game-editor/commands";
import {
  defaultPropertiesFromDefinition,
  type ComponentRegistry,
} from "@game-editor/game-components";
import {
  createScriptComponent,
  findNodeById,
  findScript,
  type ScriptComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Adds a Script component instance from a registered definition.
 * Rejects duplicates when the definition does not allow multiple.
 */
export class AddScriptComponentCommand implements Command {
  readonly name = "AddScriptComponent";
  private readonly component: ScriptComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    scriptId: string,
    registry: ComponentRegistry,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`AddScriptComponentCommand: unknown node ${nodeId}`);
    }

    const definition = registry.require(scriptId);
    const allowMultiple = definition.allowMultiple === true;
    if (!allowMultiple && findScript(node, scriptId)) {
      throw new Error(
        `AddScriptComponentCommand: "${scriptId}" already on node ${nodeId}`,
      );
    }

    this.component = createScriptComponent(
      scriptId,
      defaultPropertiesFromDefinition(definition),
    );
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
