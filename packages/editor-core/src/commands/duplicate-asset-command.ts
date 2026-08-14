import type { Command } from "@game-editor/commands";
import type { AssetHistoryHost } from "../asset-history-host.js";

export class DuplicateAssetCommand implements Command {
  readonly name = "DuplicateAsset";
  readonly async = true as const;

  constructor(
    private readonly host: AssetHistoryHost,
    private readonly createdAssetId: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.restoreAssetOnDisk(this.createdAssetId);
  }

  async undo(): Promise<void> {
    await this.host.deleteAssetOnDisk(this.createdAssetId);
  }
}
