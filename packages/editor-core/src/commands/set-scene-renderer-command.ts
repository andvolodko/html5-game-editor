import type { Command } from "@game-editor/commands";
import type { SceneRendererKind } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export type { SceneRendererKind };

/** Sets the scene's active viewport renderer (one undo step). */
export class SetSceneRendererCommand implements Command {
  readonly name = "SetSceneRenderer";
  private readonly before: SceneRendererKind | undefined;
  private readonly after: SceneRendererKind;

  constructor(
    private readonly document: DocumentManager,
    renderer: SceneRendererKind,
  ) {
    this.before = document.getScene().renderer;
    this.after = renderer;
  }

  execute(): void {
    this.document.setSceneRenderer(this.after);
  }

  undo(): void {
    this.document.setSceneRenderer(this.before);
  }
}
