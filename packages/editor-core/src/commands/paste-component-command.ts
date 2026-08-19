import type { Command } from "@game-editor/commands";
import type { ComponentRegistry } from "@game-editor/game-components";
import {
  cloneComponentWithNewId,
  findNodeById,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import {
  isCopyableComponent,
  pasteComponentRejection,
  type CopyableComponent,
} from "../component-clipboard.js";

/**
 * Adds a cloned Script, HitZone, or Mask from the component clipboard.
 * Fresh component id; rejects singleton duplicates and 3D HitZone/Mask.
 */
export class PasteComponentCommand implements Command {
  readonly name = "PasteComponent";
  private readonly component: CopyableComponent;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    template: CopyableComponent,
    registry: ComponentRegistry,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`PasteComponentCommand: unknown node ${nodeId}`);
    }
    const rejection = pasteComponentRejection(node, template, registry);
    if (rejection) {
      throw new Error(`PasteComponentCommand: ${rejection}`);
    }
    const cloned = cloneComponentWithNewId(template);
    if (!isCopyableComponent(cloned)) {
      throw new Error("PasteComponentCommand: cloned component is not copyable");
    }
    this.component = cloned;
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
