import type { Command } from "@game-editor/commands";
import type { AssetHistoryHost } from "../asset-history-host.js";

export class DeleteAssetCommand implements Command {
  readonly name = "DeleteAsset";
  readonly async = true as const;

  constructor(
    private readonly host: AssetHistoryHost,
    private readonly assetId: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.deleteAssetOnDisk(this.assetId);
  }

  async undo(): Promise<void> {
    await this.host.restoreAssetOnDisk(this.assetId);
  }
}
