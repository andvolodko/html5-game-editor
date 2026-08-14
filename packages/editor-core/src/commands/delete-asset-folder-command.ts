import type { Command } from "@game-editor/commands";
import type { AssetHistoryHost } from "../asset-history-host.js";

export class DeleteAssetFolderCommand implements Command {
  readonly name = "DeleteAssetFolder";
  readonly async = true as const;

  constructor(
    private readonly host: AssetHistoryHost,
    private readonly folderPath: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.deleteFolderOnDisk(this.folderPath);
  }

  async undo(): Promise<void> {
    await this.host.restoreFolderOnDisk(this.folderPath);
  }
}
