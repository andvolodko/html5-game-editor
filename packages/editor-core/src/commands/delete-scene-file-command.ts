import type { Command } from "@game-editor/commands";
import type { SceneData } from "@game-editor/scene";
import type { SceneFileHistoryHost } from "../scene-file-history-host.js";

export class DeleteSceneFileCommand implements Command {
  readonly name = "DeleteSceneFile";
  readonly async = true as const;

  constructor(
    private readonly host: SceneFileHistoryHost,
    private readonly sceneId: string,
    private readonly snapshot: SceneData,
    private readonly fallbackSceneId: string,
    private readonly wasActive: boolean,
    private readonly wasStartScene: boolean,
  ) {}

  async execute(): Promise<void> {
    await this.host.deleteSceneFileOnDisk(this.sceneId, this.fallbackSceneId, {
      preserveUndo: true,
    });
  }

  async undo(): Promise<void> {
    await this.host.restoreSceneFileOnDisk(this.sceneId, this.snapshot, {
      open: this.wasActive,
      restoreStartScene: this.wasStartScene,
    });
  }
}
