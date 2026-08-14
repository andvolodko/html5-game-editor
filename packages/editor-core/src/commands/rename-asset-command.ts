import type { Command } from "@game-editor/commands";
import type { AssetHistoryHost } from "../asset-history-host.js";

export class RenameAssetCommand implements Command {
  readonly name = "RenameAsset";
  readonly async = true as const;

  constructor(
    private readonly host: AssetHistoryHost,
    private readonly assetId: string,
    private readonly fromName: string,
    private readonly toName: string,
  ) {}

  async execute(): Promise<void> {
    await this.host.renameAssetOnDisk(this.assetId, this.toName);
  }

  async undo(): Promise<void> {
    await this.host.renameAssetOnDisk(this.assetId, this.fromName);
  }
}
