import { useEffect, useRef, useState } from "react";
import {
  ASSETS_ROOT_FOLDER,
  decodeAssetDragPayload,
  EDITOR_ASSET_MIME,
  importDroppedFiles,
  isScenesFolder,
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

/** How often the Assets panel re-lists (server reconciles FS ↔ manifest on each list). */
const ASSET_CATALOGUE_POLL_MS = 2500;

function isTextEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function AssetsPanel() {
  const unsaved = useUnsavedChangesGuard();
  const model = useAssetBrowserModel({ runGuarded: unsaved.runGuarded });
  const [dropActive, setDropActive] = useState(false);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<AssetContextMenuState>(null);
  const [panelFocused, setPanelFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

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
    if (!panelFocused) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target) || model.renaming) {
        return;
      }

      if (event.key === "F2") {
        if (model.selection?.kind === "asset") {
          event.preventDefault();
          model.setRenaming({ kind: "asset", id: model.selection.id });
        } else if (model.selection?.kind === "scene") {
          event.preventDefault();
          model.setRenaming({ kind: "scene", id: model.selection.id });
        } else if (
          model.selection?.kind === "folder" &&
          model.selection.path !== ASSETS_ROOT_FOLDER &&
          !isScenesFolder(model.selection.path)
        ) {
          event.preventDefault();
          model.setRenaming({ kind: "folder", path: model.selection.path });
        }
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (model.selection?.kind === "asset") {
        event.preventDefault();
        void model.removeAsset(model.selection.id);
        return;
      }
      if (model.selection?.kind === "scene") {
        event.preventDefault();
        void model.removeScene(model.selection.id);
        return;
      }
      if (
        model.selection?.kind === "folder" &&
        model.selection.path !== ASSETS_ROOT_FOLDER &&
        !isScenesFolderOrDescendant(model.selection.path)
      ) {
        event.preventDefault();
        void model.removeFolder(model.selection.path);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelFocused, model]);

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
      model.setExpanded((prev) => new Set(prev).add(destination));
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
    setDropFolder(null);
    setDropActive(false);

    if (isScenesFolderOrDescendant(destination)) {
      setImportMessage("Cannot place textures in assets/scenes");
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      void onDropFiles(event.dataTransfer.files, destination);
      return;
    }

    const raw = event.dataTransfer.getData(EDITOR_ASSET_MIME);
    const payload = decodeAssetDragPayload(raw);
    if (!payload) {
      return;
    }
    await model.moveAsset(payload.assetId, destination);
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
        if (event.dataTransfer.files.length > 0) {
          void onDropFiles(event.dataTransfer.files, model.importDestination);
        }
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

      {model.error ? <p className="panel-error">{model.error}</p> : null}
      {model.scenesError ? <p className="panel-error">{model.scenesError}</p> : null}
      {model.folderMessage ? <p className="panel-error">{model.folderMessage}</p> : null}
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
                  selected={
                    model.selection?.kind === "scene" &&
                    model.selection.id === scene.id
                  }
                  renaming={
                    model.renaming?.kind === "scene" &&
                    model.renaming.id === scene.id
                  }
                  onSelect={() =>
                    model.setSelection({ kind: "scene", id: scene.id })
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
                    model.setSelection({ kind: "scene", id: scene.id });
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
                  selected={
                    model.selection?.kind === "asset" &&
                    model.selection.id === asset.id
                  }
                  renaming={
                    model.renaming?.kind === "asset" &&
                    model.renaming.id === asset.id
                  }
                  previewUrl={model.contentUrl(asset)}
                  dropTarget={false}
                  onSelect={() => model.setSelection({ kind: "asset", id: asset.id })}
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
                    model.setSelection({ kind: "asset", id: asset.id });
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
              model.setSelection({ kind: "folder", path });
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
              model.setSelection({ kind: "asset", id: assetId });
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
              model.setSelection({ kind: "scene", id: sceneId });
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
            void model.removeAsset(id);
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
          onNewScene={() => {
            void model.createScene();
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
    </div>
  );
}
