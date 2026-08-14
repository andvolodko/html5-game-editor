import type { Command } from "@game-editor/commands";
import type { SceneFileHistoryHost } from "../scene-file-history-host.js";

export class RenameSceneFileCommand implements Command {
  readonly name = "RenameSceneFile";
  readonly async = true as const;

  constructor(
    private readonly host: SceneFileHistoryHost,
    private readonly fromId: string,
    private readonly toId: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.renameSceneFileOnDisk(this.fromId, this.toId);
  }

  async undo(): Promise<void> {
    await this.host.renameSceneFileOnDisk(this.toId, this.fromId);
  }
}
