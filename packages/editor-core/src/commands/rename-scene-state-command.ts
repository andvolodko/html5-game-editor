import type { Command } from "@game-editor/commands";
import type { NodeStateId, SceneStateDefinition } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export class RenameSceneStateCommand implements Command {
  readonly name = "RenameSceneState";
  private readonly before: SceneStateDefinition[] | undefined;
  private readonly after: SceneStateDefinition[] | undefined;
  private readonly changed: boolean;

  constructor(
    private readonly document: DocumentManager,
    stateId: NodeStateId,
    nextName: string,
  ) {
    const scene = document.getScene();
    this.before =
      scene.states === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(scene.states)) as SceneStateDefinition[]);
    const trimmed = nextName.trim();
    if (!this.before || trimmed.length === 0) {
      this.after = this.before;
      this.changed = false;
      return;
    }
    const index = this.before.findIndex((entry) => entry.id === stateId);
    if (index < 0) {
      this.after = this.before;
      this.changed = false;
      return;
    }
    const current = this.before[index]!;
    if (current.name === trimmed) {
      this.after = this.before;
      this.changed = false;
      return;
    }
    this.after = this.before.map((entry, i) =>
      i === index ? { ...entry, name: trimmed } : entry,
    );
    this.changed = true;
  }

  execute(): void {
    if (!this.changed) {
      return;
    }
    this.document.setSceneStates(this.after);
  }

  undo(): void {
    if (!this.changed) {
      return;
    }
    this.document.setSceneStates(this.before);
  }
}
