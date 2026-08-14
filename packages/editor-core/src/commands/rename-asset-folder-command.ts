import type { Command } from "@game-editor/commands";
import {
  posixPathBasename,
  type AssetHistoryHost,
} from "../asset-history-host.js";

export class RenameAssetFolderCommand implements Command {
  readonly name = "RenameAssetFolder";
  readonly async = true as const;

  constructor(
    private readonly host: AssetHistoryHost,
    private readonly fromPath: string,
    private readonly toPath: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.renameFolderOnDisk(
      this.fromPath,
      posixPathBasename(this.toPath),
    );
  }

  async undo(): Promise<void> {
    await this.host.renameFolderOnDisk(
      this.toPath,
      posixPathBasename(this.fromPath),
    );
  }
}
