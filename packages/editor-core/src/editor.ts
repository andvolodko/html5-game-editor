import { CommandManager } from "@game-editor/commands";
import { createEmptyScene, type SceneData } from "@game-editor/scene";
import { SelectionManager } from "./selection-manager.js";

export type DocumentDirtyState = "clean" | "dirty";

/**
 * Thin editor façade. React UI should read state and dispatch commands through this layer.
 */
export class Editor {
  readonly commands: CommandManager;
  readonly selection: SelectionManager;
  private scene: SceneData;
  private dirtyState: DocumentDirtyState = "clean";

  constructor(scene: SceneData = createEmptyScene()) {
    this.commands = new CommandManager();
    this.selection = new SelectionManager();
    this.scene = scene;
  }

  getScene(): SceneData {
    return this.scene;
  }

  setScene(scene: SceneData): void {
    this.scene = scene;
    this.selection.clear();
    this.dirtyState = "clean";
  }

  markDirty(): void {
    this.dirtyState = "dirty";
  }

  markClean(): void {
    this.dirtyState = "clean";
  }

  getDirtyState(): DocumentDirtyState {
    return this.dirtyState;
  }
}
