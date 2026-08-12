import type { Command } from "@game-editor/commands";
import {
  createSpriteNode,
  DEFAULT_NODE_SPAWN_POSITION,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export interface CreateSpriteOptions {
  name?: string;
  position?: Vec2;
  assetId?: string;
  width?: number;
  height?: number;
  tint?: number;
}

export class CreateSpriteCommand implements Command {
  readonly name = "CreateSprite";
  private readonly node;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: CreateSpriteOptions | string = {},
    positionArg?: Vec2,
  ) {
    const normalized: CreateSpriteOptions =
      typeof options === "string"
        ? {
            name: options,
            ...(positionArg !== undefined ? { position: positionArg } : {}),
          }
        : options;

    this.node = createSpriteNode(
      normalized.name ?? "Sprite",
      normalized.position ?? { ...DEFAULT_NODE_SPAWN_POSITION },
      {
        ...(normalized.assetId !== undefined
          ? { assetId: normalized.assetId }
          : {}),
        ...(normalized.width !== undefined ? { width: normalized.width } : {}),
        ...(normalized.height !== undefined
          ? { height: normalized.height }
          : {}),
        ...(normalized.tint !== undefined ? { tint: normalized.tint } : {}),
      },
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
