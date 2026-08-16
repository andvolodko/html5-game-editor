import { memo } from "react";
import type { AssetRecord } from "@game-editor/assets";
import {
  EDITOR_ASSET_MIME,
  encodeAssetDragPayload,
} from "@game-editor/editor-core";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";
import { InlineRename } from "./InlineRename";
import { treeIndentPadding } from "../ui/tree-indent";

interface AssetRowProps {
  asset: AssetRecord;
  depth: number;
  selected: boolean;
  renaming: boolean;
  previewUrl: string | undefined;
  dropTarget: boolean;
  editing?: boolean;
  onSelect: (event: React.MouseEvent) => void;
  getDragAssetIds: (assetId: string) => readonly string[];
  onActivate?: () => void;
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
  editing = false,
  onSelect,
  getDragAssetIds,
  onActivate,
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
      onPointerDown={(event) => {
        if (event.button !== MOUSE_BUTTON_PRIMARY) {
          return;
        }
        onSelect(event);
      }}
      onDoubleClick={onActivate ?? onStartRename}
      onContextMenu={onContextMenu}
      onDragStart={(event) => {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          event.preventDefault();
          return;
        }
        const assetIds = getDragAssetIds(asset.id);
        const primaryId = assetIds[0] ?? asset.id;
        event.dataTransfer.setData(
          EDITOR_ASSET_MIME,
          encodeAssetDragPayload({ assetId: primaryId, assetIds }),
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
      {editing ? <span className="asset-badge">open</span> : null}
    </div>
  );
}

function assetRowIconClass(type: AssetRecord["type"]): string {
  if (type === "spine") {
    return "asset-row-icon spine";
  }
  if (type === "font") {
    return "asset-row-icon font";
  }
  if (type === "webfont") {
    return "asset-row-icon webfont";
  }
  if (type === "audio") {
    return "asset-row-icon audio";
  }
  if (type === "gltf") {
    return "asset-row-icon gltf";
  }
  if (type === "aseprite") {
    return "asset-row-icon aseprite";
  }
  if (type === "prefab") {
    return "asset-row-icon prefab";
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
    prev.onActivate === next.onActivate &&
    prev.getDragAssetIds === next.getDragAssetIds &&
    prev.renaming === next.renaming &&
    prev.previewUrl === next.previewUrl &&
    prev.dropTarget === next.dropTarget &&
    prev.editing === next.editing
  );
}

/** Memoized so catalogue polls only remount rows whose record identity changed. */
export const AssetRow = memo(AssetRowComponent, assetRowPropsEqual);
