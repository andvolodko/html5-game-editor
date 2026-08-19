import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASSETS_ROOT_FOLDER,
  collectDroppedFiles,
  assetIdsFromDragPayload,
  decodeAssetDragPayload,
  droppedFolderPaths,
  EDITOR_ASSET_MIME,
  importDroppedFiles,
  isScenesFolderOrDescendant,
} from "@game-editor/editor-core";
import {
  AssetContextMenu,
  type AssetContextMenuState,
} from "./AssetContextMenu";
import { AssetRow } from "./AssetRow";
import { FolderBranch } from "./FolderBranch";
import { SceneRow } from "./SceneRow";
import { useUnsavedChangesGuard } from "../unsaved/useUnsavedChangesGuard";
import { useAssetBrowserModel } from "./useAssetBrowserModel";
import { useAssetsPanelHotkeys } from "./useAssetsPanelHotkeys";
import { useDeleteAssetConfirm } from "./useDeleteAssetConfirm";

/** How often the Assets panel re-lists (server reconciles FS ↔ manifest on each list). */
const ASSET_CATALOGUE_POLL_MS = 2500;

export function AssetsPanel() {
  const unsaved = useUnsavedChangesGuard();
  const deleteAsset = useDeleteAssetConfirm();
  const model = useAssetBrowserModel({ runGuarded: unsaved.runGuarded });
  const [dropActive, setDropActive] = useState(false);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<AssetContextMenuState>(null);
  const [panelFocused, setPanelFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const confirmDeleteAssets = useCallback(
    async (assetIds: readonly string[]) => {
      const confirmed = await deleteAsset.confirmDeleteAssets(assetIds);
      panelRef.current?.focus({ preventScroll: true });
      return confirmed;
    },
    [deleteAsset.confirmDeleteAssets],
  );

  useAssetsPanelHotkeys(model, panelFocused && !deleteAsset.open, treeRef, {
    confirmDeleteAssets,
  });

  useEffect(() => {
    const refresh = () => {
      void model.editor.assets.refresh().catch(() => {
        // error surfaced via AssetManager status
      });
    };
    refresh();
    const timer = window.setInterval(refresh, ASSET_CATALOGUE_POLL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [model.editor]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const close = () => setContextMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  const onDropFiles = async (files: FileList | File[], destination: string) => {
    setImportMessage(null);
    try {
      const result = await importDroppedFiles(model.editor, [...files], destination);
      setImportMessage(result.message);
      model.setExpanded((prev) => {
        const next = new Set(prev);
        for (const folder of droppedFolderPaths([...files], destination)) {
          next.add(folder);
        }
        return next;
      });
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Import failed");
    }
  };

  const acceptAssetDrop = (event: React.DragEvent, destination: string) => {
    if (isScenesFolderOrDescendant(destination)) {
      return false;
    }
    if (![...event.dataTransfer.types].includes(EDITOR_ASSET_MIME)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropFolder(destination);
    return true;
  };

  const handleAssetDropOnFolder = async (
    event: React.DragEvent,
    destination: string,
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = collectDroppedFiles(event.dataTransfer);
    const assetRaw = event.dataTransfer.getData(EDITOR_ASSET_MIME);
    setDropFolder(null);
    setDropActive(false);

    if (isScenesFolderOrDescendant(destination)) {
      setImportMessage("Cannot place textures in assets/scenes");
      return;
    }

    const files = await droppedFiles;
    if (files.length > 0) {
      void onDropFiles(files, destination);
      return;
    }

    const payload = decodeAssetDragPayload(assetRaw);
    if (!payload) {
      return;
    }
    await model.moveAssets(assetIdsFromDragPayload(payload), destination);
  };

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      data-editor-panel="assets"
      className={
        dropActive || dropFolder
          ? "panel assets-panel drop-active"
          : "panel assets-panel"
      }
      onFocus={() => setPanelFocused(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        setPanelFocused(false);
      }}
      onPointerDownCapture={() => {
        panelRef.current?.focus({ preventScroll: true });
      }}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setDropActive(true);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropActive(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDropActive(false);
          setDropFolder(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        setDropFolder(null);
        const droppedFiles = collectDroppedFiles(event.dataTransfer);
        void droppedFiles.then((files) => {
          if (files.length > 0) {
            void onDropFiles(files, model.importDestination);
          }
        });
      }}
      onClick={() => setContextMenu(null)}
    >
      <div className="panel-toolbar">
        <input
          className="asset-search"
          placeholder="Search assets…"
          value={model.query}
          onChange={(event) => model.setQuery(event.target.value)}
        />
        <button
          type="button"
          disabled={
            model.searching ||
            model.status === "loading" ||
            model.status === "importing"
          }
          onClick={() => {
            model.setFolderMessage(null);
            model.setCreatingFolder(true);
            model.setNewFolderName("");
          }}
        >
          New Folder
        </button>
        <button
          type="button"
          disabled={model.status === "loading" || model.status === "importing"}
          onClick={() => {
            void model.editor.assets.refresh({ force: true }).catch(() => undefined);
            void model.refreshScenes();
          }}
        >
          Refresh
        </button>
      </div>

      {model.creatingFolder && !model.searching ? (
        <form
          className="asset-new-folder"
          onSubmit={(event) => {
            event.preventDefault();
            void model.createFolder();
          }}
        >
          <span className="asset-new-folder-hint mono">{model.folderParentForCreate}/</span>
          <input
            className="asset-search"
            placeholder="Folder name"
            value={model.newFolderName}
            autoFocus
            onChange={(event) => model.setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                model.setCreatingFolder(false);
                model.setNewFolderName("");
              }
            }}
          />
          <button type="submit" disabled={model.newFolderName.trim().length === 0}>
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              model.setCreatingFolder(false);
              model.setNewFolderName("");
            }}
          >
            Cancel
          </button>
        </form>
      ) : null}

      {dropActive || dropFolder ? (
        <p className="assets-drop-hint">
          Drop into {dropFolder ?? model.importDestination}
        </p>
      ) : null}

      {model.status === "loading" || model.status === "importing" ? (
        <p className="panel-hint">
          {model.status === "importing" ? "Importing…" : "Loading…"}
        </p>
      ) : null}

      {model.panelErrors.map((message) => (
        <p key={message} className="panel-error">
          {message}
        </p>
      ))}
      {importMessage ? <p className="panel-hint">{importMessage}</p> : null}

      <div
        ref={treeRef}
        className="asset-tree"
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            kind: "root",
          });
        }}
      >
        {model.searching ? (
          model.searchAssets.length === 0 && model.searchScenes.length === 0 ? (
            <p className="panel-empty">No matching assets</p>
          ) : (
            <>
              {model.searchScenes.map((scene) => (
                <SceneRow
                  key={`search-scene-${scene.id}`}
                  id={scene.id}
                  depth={0}
                  active={model.activeSceneId === scene.id}
                  selected={model.isSelected({ kind: "scene", id: scene.id })}
                  renaming={
                    model.renaming?.kind === "scene" &&
                    model.renaming.id === scene.id
                  }
                  onSelect={(event) =>
                    model.selectItem({ kind: "scene", id: scene.id }, event)
                  }
                  onOpen={() => {
                    void model.openScene(scene.id);
                  }}
                  onCommitRename={(name) => {
                    void model.renameScene(scene.id, name);
                  }}
                  onCancelRename={() => model.setRenaming(undefined)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!model.isSelected({ kind: "scene", id: scene.id })) {
                      model.setSelection({ kind: "scene", id: scene.id });
                    }
                    setContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                      kind: "scene",
                      id: scene.id,
                    });
                  }}
                />
              ))}
              {model.searchAssets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  depth={0}
                  selected={model.isSelected({ kind: "asset", id: asset.id })}
                  renaming={
                    model.renaming?.kind === "asset" &&
                    model.renaming.id === asset.id
                  }
                  previewUrl={model.contentUrl(asset)}
                  dropTarget={false}
                  editing={model.openPrefabAssetId === asset.id}
                  onSelect={(event) =>
                    model.selectItem({ kind: "asset", id: asset.id }, event)
                  }
                  getDragAssetIds={model.assetIdsForDrag}
                  onActivate={
                    asset.type === "prefab"
                      ? () => {
                          void model.editor.openPrefab(asset.id).catch(() => undefined);
                        }
                      : undefined
                  }
                  onStartRename={() =>
                    model.setRenaming({ kind: "asset", id: asset.id })
                  }
                  onCommitRename={(name) => {
                    void model.renameAsset(asset.id, name);
                  }}
                  onCancelRename={() => model.setRenaming(undefined)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!model.isSelected({ kind: "asset", id: asset.id })) {
                      model.setSelection({ kind: "asset", id: asset.id });
                    }
                    setContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                      kind: "asset",
                      id: asset.id,
                    });
                  }}
                />
              ))}
            </>
          )
        ) : (
          <FolderBranch
            path={ASSETS_ROOT_FOLDER}
            name="Assets"
            depth={0}
            model={model}
            dropFolder={dropFolder}
            isRoot
            onAcceptDrop={acceptAssetDrop}
            onDrop={handleAssetDropOnFolder}
            onContextMenu={(event, path) => {
              event.preventDefault();
              event.stopPropagation();
              if (!model.isSelected({ kind: "folder", path })) {
                model.setSelection({ kind: "folder", path });
              }
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                kind: "folder",
                path,
              });
            }}
            onAssetContextMenu={(event, assetId) => {
              event.preventDefault();
              event.stopPropagation();
              if (!model.isSelected({ kind: "asset", id: assetId })) {
                model.setSelection({ kind: "asset", id: assetId });
              }
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                kind: "asset",
                id: assetId,
              });
            }}
            onSceneContextMenu={(event, sceneId) => {
              event.preventDefault();
              event.stopPropagation();
              if (!model.isSelected({ kind: "scene", id: sceneId })) {
                model.setSelection({ kind: "scene", id: sceneId });
              }
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                kind: "scene",
                id: sceneId,
              });
            }}
          />
        )}
      </div>

      {contextMenu ? (
        <AssetContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onRenameAsset={(id) => model.setRenaming({ kind: "asset", id })}
          onRenameFolder={(path) => model.setRenaming({ kind: "folder", path })}
          onRemoveAsset={(id) => {
            void (async () => {
              if (!(await confirmDeleteAssets([id]))) {
                return;
              }
              await model.removeAsset(id);
            })();
          }}
          onDuplicateAsset={(id) => {
            void model.duplicateAsset(id);
          }}
          onRemoveFolder={(path) => {
            void model.removeFolder(path);
          }}
          onOpenScene={(id) => {
            void model.openScene(id);
          }}
          onRenameScene={(id) => model.setRenaming({ kind: "scene", id })}
          onRemoveScene={(id) => {
            void model.removeScene(id);
          }}
          onDuplicateScene={(id) => {
            void model.duplicateScene(id);
          }}
          onNewScene={() => {
            void model.createScene();
          }}
          onOpenPrefab={(id) => {
            void model.editor.openPrefab(id).catch(() => undefined);
          }}
          onInstantiatePrefab={(id) => {
            void model.editor.instantiatePrefabFromAsset(id).catch((error: unknown) => {
              model.editor.console.log({
                level: "error",
                category: "prefab",
                message:
                  error instanceof Error
                    ? error.message
                    : "Instantiate prefab failed",
              });
            });
          }}
          onCreateTileSet={(id) => {
            void model.editor.createTileSetFromTexture(id).catch((error: unknown) => {
              model.editor.console.log({
                level: "error",
                category: "assets",
                message:
                  error instanceof Error
                    ? error.message
                    : "Create TileSet failed",
              });
            });
          }}
          onNewFolder={(folderPath) => {
            if (folderPath) {
              model.setSelection({ kind: "folder", path: folderPath });
            }
            model.setCreatingFolder(true);
            model.setNewFolderName("");
          }}
        />
      ) : null}

      {unsaved.dialog}
      {deleteAsset.dialog}
    </div>
  );
}
