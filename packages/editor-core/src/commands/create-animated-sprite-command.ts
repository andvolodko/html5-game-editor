import type { Command } from "@game-editor/commands";
import {
  createAnimatedSpriteComponent,
  createNodeWithVisual,
  DEFAULT_NODE_SPAWN_POSITION,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export interface CreateAnimatedSpriteOptions {
  name?: string;
  position?: Vec2;
  assetId?: string;
  animation?: string;
  frames?: string[];
  animationSpeed?: number;
  loop?: boolean;
  playing?: boolean;
  width?: number;
  height?: number;
}

export class CreateAnimatedSpriteCommand implements Command {
  readonly name = "CreateAnimatedSprite";
  private readonly node;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: CreateAnimatedSpriteOptions = {},
  ) {
    this.node = createNodeWithVisual(
      options.name ?? "Animated Sprite",
      options.position ?? { ...DEFAULT_NODE_SPAWN_POSITION },
      createAnimatedSpriteComponent({
        ...(options.assetId !== undefined ? { assetId: options.assetId } : {}),
        ...(options.animation !== undefined
          ? { animation: options.animation }
          : {}),
        ...(options.frames !== undefined ? { frames: options.frames } : {}),
        ...(options.animationSpeed !== undefined
          ? { animationSpeed: options.animationSpeed }
          : {}),
        ...(options.loop !== undefined ? { loop: options.loop } : {}),
        ...(options.playing !== undefined ? { playing: options.playing } : {}),
        ...(options.width !== undefined ? { width: options.width } : {}),
        ...(options.height !== undefined ? { height: options.height } : {}),
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
