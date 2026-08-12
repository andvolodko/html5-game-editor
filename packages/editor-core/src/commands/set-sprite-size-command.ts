import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getSprite,
  type SpriteComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export interface SpriteSizePatch {
  width?: number;
  height?: number;
}

function cloneSpriteSize(sprite: SpriteComponentData): {
  width: number;
  height: number;
} {
  return { width: sprite.width, height: sprite.height };
}

export class SetSpriteSizeCommand implements Command {
  readonly name = "SetSpriteSize";
  private readonly before: { width: number; height: number };
  private readonly after: { width: number; height: number };

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: SpriteSizePatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const sprite = node ? getSprite(node) : undefined;
    if (!node || !sprite) {
      throw new Error(`SetSpriteSizeCommand: node ${nodeId} missing Sprite`);
    }

    this.before = cloneSpriteSize(sprite);
    this.after = {
      width: patch.width ?? sprite.width,
      height: patch.height ?? sprite.height,
    };
  }

  execute(): void {
    this.document.applySpriteSize(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applySpriteSize(this.nodeId, this.before);
  }
}
