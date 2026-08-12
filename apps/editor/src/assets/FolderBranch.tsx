import {
  isScenesFolder,
  isScenesFolderOrDescendant,
} from "@game-editor/editor-core";
import { AssetRow } from "./AssetRow";
import { InlineRename } from "./InlineRename";
import { SceneRow } from "./SceneRow";
import { useAssetBrowserModel } from "./useAssetBrowserModel";
import { treeIndentPadding } from "../ui/tree-indent";

export interface FolderBranchProps {
  path: string;
  name: string;
  depth: number;
  model: ReturnType<typeof useAssetBrowserModel>;
  dropFolder: string | null;
  isRoot?: boolean;
  onAcceptDrop: (event: React.DragEvent, destination: string) => boolean;
  onDrop: (event: React.DragEvent, destination: string) => Promise<void>;
  onContextMenu: (event: React.MouseEvent, path: string) => void;
  onAssetContextMenu: (event: React.MouseEvent, assetId: string) => void;
  onSceneContextMenu: (event: React.MouseEvent, sceneId: string) => void;
}

export function FolderBranch(props: FolderBranchProps) {
  const {
    path,
    name,
    depth,
    model,
    dropFolder,
    isRoot,
    onAcceptDrop,
    onDrop,
    onContextMenu,
    onAssetContextMenu,
    onSceneContextMenu,
  } = props;
  const expanded = model.expanded.has(path);
  const entries = model.entriesForFolder(path);
  const selected =
    model.selection?.kind === "folder" && model.selection.path === path;
  const renaming =
    model.renaming?.kind === "folder" && model.renaming.path === path;
  const isDropTarget = dropFolder === path;
  const reservedScenes = isScenesFolder(path);
  const acceptsDrops = !isScenesFolderOrDescendant(path);

  return (
    <div className="asset-branch">
      <div
        className={[
          "asset-row",
          selected ? "selected" : "",
          isDropTarget ? "drop-target" : "",
          reservedScenes ? "asset-scenes-folder" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: treeIndentPadding(depth) }}
        data-folder-path={path}
        onClick={() => model.setSelection({ kind: "folder", path })}
        onContextMenu={(event) => onContextMenu(event, path)}
        onDragOver={(event) => {
          if (!acceptsDrops) {
            return;
          }
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "copy";
            return;
          }
          onAcceptDrop(event, path);
        }}
        onDragLeave={() => {
          // cleared by parent panel leave / drop
        }}
        onDrop={(event) => {
          if (!acceptsDrops) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          void onDrop(event, path);
        }}
      >
        <button
          type="button"
          className="hierarchy-expand"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(event) => {
            event.stopPropagation();
            model.toggleExpanded(path);
          }}
        >
          {expanded ? "▼" : "▶"}
        </button>
        <span
          className={
            reservedScenes ? "asset-row-icon scene-folder" : "asset-row-icon folder"
          }
          aria-hidden
        />
        {renaming && !isRoot && !reservedScenes ? (
          <InlineRename
            initialValue={name}
            onCommit={(value) => {
              void model.renameFolder(path, value);
            }}
            onCancel={() => model.setRenaming(undefined)}
          />
        ) : (
          <span className="hierarchy-label">{name}</span>
        )}
      </div>
      {expanded
        ? entries.map((entry) => {
            if (entry.kind === "folder") {
              return (
                <FolderBranch
                  key={entry.path}
                  path={entry.path}
                  name={entry.name}
                  depth={depth + 1}
                  model={model}
                  dropFolder={dropFolder}
                  onAcceptDrop={onAcceptDrop}
                  onDrop={onDrop}
                  onContextMenu={onContextMenu}
                  onAssetContextMenu={onAssetContextMenu}
                  onSceneContextMenu={onSceneContextMenu}
                />
              );
            }
            if (entry.kind === "scene") {
              return (
                <SceneRow
                  key={`scene-${entry.id}`}
                  id={entry.id}
                  depth={depth + 1}
                  active={model.activeSceneId === entry.id}
                  selected={
                    model.selection?.kind === "scene" &&
                    model.selection.id === entry.id
                  }
                  renaming={
                    model.renaming?.kind === "scene" &&
                    model.renaming.id === entry.id
                  }
                  onSelect={() =>
                    model.setSelection({ kind: "scene", id: entry.id })
                  }
                  onOpen={() => {
                    void model.openScene(entry.id);
                  }}
                  onCommitRename={(value) => {
                    void model.renameScene(entry.id, value);
                  }}
                  onCancelRename={() => model.setRenaming(undefined)}
                  onContextMenu={(event) => onSceneContextMenu(event, entry.id)}
                />
              );
            }
            return (
              <AssetRow
                key={entry.asset.id}
                asset={entry.asset}
                depth={depth + 1}
                selected={
                  model.selection?.kind === "asset" &&
                  model.selection.id === entry.asset.id
                }
                renaming={
                  model.renaming?.kind === "asset" &&
                  model.renaming.id === entry.asset.id
                }
                previewUrl={model.contentUrl(entry.asset)}
                dropTarget={false}
                onSelect={() =>
                  model.setSelection({ kind: "asset", id: entry.asset.id })
                }
                onStartRename={() =>
                  model.setRenaming({ kind: "asset", id: entry.asset.id })
                }
                onCommitRename={(value) => {
                  void model.renameAsset(entry.asset.id, value);
                }}
                onCancelRename={() => model.setRenaming(undefined)}
                onContextMenu={(event) =>
                  onAssetContextMenu(event, entry.asset.id)
                }
              />
            );
          })
        : null}
      {expanded && entries.length === 0 && depth === 0 ? (
        <p className="panel-empty asset-tree-empty">
          Drop images here or create a folder
        </p>
      ) : null}
      {expanded && entries.length === 0 && reservedScenes ? (
        <p className="panel-empty asset-tree-empty">
          No scenes yet — right-click to create one
        </p>
      ) : null}
    </div>
  );
}
