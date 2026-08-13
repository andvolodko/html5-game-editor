import { memo } from "react";
import type { AssetRecord } from "@game-editor/assets";
import {
  EDITOR_ASSET_MIME,
  encodeAssetDragPayload,
} from "@game-editor/editor-core";
import { InlineRename } from "./InlineRename";
import { treeIndentPadding } from "../ui/tree-indent";

interface AssetRowProps {
  asset: AssetRecord;
  depth: number;
  selected: boolean;
  renaming: boolean;
  previewUrl: string | undefined;
  dropTarget: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

function AssetRowComponent({
  asset,
  depth,
  selected,
  renaming,
  previewUrl,
  dropTarget,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onContextMenu,
}: AssetRowProps) {
  return (
    <div
      className={[
        "asset-row",
        selected ? "selected" : "",
        dropTarget ? "drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ paddingLeft: treeIndentPadding(depth) }}
      draggable={!renaming}
      onClick={onSelect}
      onDoubleClick={onStartRename}
      onContextMenu={onContextMenu}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          EDITOR_ASSET_MIME,
          encodeAssetDragPayload({ assetId: asset.id }),
        );
        event.dataTransfer.effectAllowed = "copyMove";
      }}
      title={`${asset.name}\n${asset.path}\n${asset.id}`}
    >
      <span className="hierarchy-expand" aria-hidden>
        ·
      </span>
      <span className="asset-row-thumb">
        {previewUrl ? (
          <img src={previewUrl} alt="" draggable={false} />
        ) : (
          <span className={assetRowIconClass(asset.type)} aria-hidden />
        )}
      </span>
      {renaming ? (
        <InlineRename
          initialValue={asset.name}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="hierarchy-label">{asset.name}</span>
      )}
    </div>
  );
}

function assetRowIconClass(type: AssetRecord["type"]): string {
  if (type === "spine") {
    return "asset-row-icon spine";
  }
  if (type === "audio") {
    return "asset-row-icon audio";
  }
  if (type === "gltf") {
    return "asset-row-icon gltf";
  }
  return "asset-row-icon texture";
}

function assetRowPropsEqual(
  prev: AssetRowProps,
  next: AssetRowProps,
): boolean {
  return (
    prev.asset === next.asset &&
    prev.depth === next.depth &&
    prev.selected === next.selected &&
    prev.renaming === next.renaming &&
    prev.previewUrl === next.previewUrl &&
    prev.dropTarget === next.dropTarget
  );
}

/** Memoized so catalogue polls only remount rows whose record identity changed. */
export const AssetRow = memo(AssetRowComponent, assetRowPropsEqual);
