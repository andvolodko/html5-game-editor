import type { Command } from "@game-editor/commands";
import {
  createNodeWithVisual,
  createSpineComponent,
  DEFAULT_NODE_SPAWN_POSITION,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export interface CreateSpineOptions {
  name?: string;
  position?: Vec2;
  assetId?: string;
  skin?: string;
  animation?: string;
  loop?: boolean;
  timeScale?: number;
  playing?: boolean;
}

export class CreateSpineCommand implements Command {
  readonly name = "CreateSpine";
  private readonly node;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: CreateSpineOptions = {},
  ) {
    this.node = createNodeWithVisual(
      options.name ?? "Spine",
      options.position ?? { ...DEFAULT_NODE_SPAWN_POSITION },
      createSpineComponent({
        ...(options.assetId !== undefined ? { assetId: options.assetId } : {}),
        ...(options.skin !== undefined ? { skin: options.skin } : {}),
        ...(options.animation !== undefined
          ? { animation: options.animation }
          : {}),
        ...(options.loop !== undefined ? { loop: options.loop } : {}),
        ...(options.timeScale !== undefined
          ? { timeScale: options.timeScale }
          : {}),
        ...(options.playing !== undefined ? { playing: options.playing } : {}),
      }),
    );
    this.previousSelection = selection.getSelection();
  }

  get createdNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    this.document.addRootNode(this.node);
    this.selection.setSelection([this.node.id]);
  }

  undo(): void {
    this.document.removeNode(this.node.id);
    this.selection.restore(this.previousSelection);
  }
}
