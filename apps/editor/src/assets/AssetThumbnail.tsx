import type { AssetRecord } from "@game-editor/assets";
import {
  EDITOR_ASSET_MIME,
  encodeAssetDragPayload,
} from "@game-editor/editor-core";

interface AssetThumbnailProps {
  asset: AssetRecord;
  selected: boolean;
  previewUrl: string | undefined;
  onSelect: () => void;
}

/** Compact thumbnail used by inspector / legacy grid views. */
export function AssetThumbnail({
  asset,
  selected,
  previewUrl,
  onSelect,
}: AssetThumbnailProps) {
  return (
    <button
      type="button"
      className={selected ? "asset-card selected" : "asset-card"}
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          EDITOR_ASSET_MIME,
          encodeAssetDragPayload({ assetId: asset.id }),
        );
        event.dataTransfer.effectAllowed = "copy";
      }}
      title={`${asset.name}\n${asset.path}\n${asset.id}`}
    >
      <div className="asset-thumb asset-thumb-sm">
        {previewUrl ? (
          <img src={previewUrl} alt={asset.name} draggable={false} />
        ) : (
          <span className="asset-thumb-fallback">?</span>
        )}
      </div>
      <div className="asset-card-name">{asset.name}</div>
    </button>
  );
}
