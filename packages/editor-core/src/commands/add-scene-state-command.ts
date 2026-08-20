import type { Command } from "@game-editor/commands";
import { createId } from "@game-editor/shared";
import type { SceneStateDefinition } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export interface AddSceneStateOptions {
  name: string;
  viewport?: SceneStateDefinition["viewport"];
  /** When omitted, a new `state_…` id is allocated. */
  id?: string;
}

export class AddSceneStateCommand implements Command {
  readonly name = "AddSceneState";
  private readonly before: SceneStateDefinition[] | undefined;
  private readonly after: SceneStateDefinition[];
  readonly createdStateId: string;

  constructor(
    private readonly document: DocumentManager,
    options: AddSceneStateOptions,
  ) {
    const scene = document.getScene();
    this.before =
      scene.states === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(scene.states)) as SceneStateDefinition[]);
    this.createdStateId = options.id ?? createId("state");
    const entry: SceneStateDefinition = {
      id: this.createdStateId,
      name: options.name.trim() || "State",
    };
    if (options.viewport !== undefined) {
      entry.viewport = { ...options.viewport };
    }
    this.after = [...(this.before ?? []), entry];
  }

  execute(): void {
    this.document.setSceneStates(this.after);
  }

  undo(): void {
    this.document.setSceneStates(this.before);
  }
}
