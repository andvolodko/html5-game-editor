import { createPortal } from "react-dom";
import {
  ASSETS_ROOT_FOLDER,
  isScenesFolder,
  isScenesFolderOrDescendant,
} from "@game-editor/editor-core";

export type AssetContextMenuState =
  | { x: number; y: number; kind: "asset"; id: string }
  | { x: number; y: number; kind: "folder"; path: string }
  | { x: number; y: number; kind: "scene"; id: string }
  | { x: number; y: number; kind: "root" }
  | null;

export function AssetContextMenu({
  menu,
  onClose,
  onRenameAsset,
  onRenameFolder,
  onRemoveAsset,
  onRemoveFolder,
  onOpenScene,
  onRenameScene,
  onRemoveScene,
  onNewScene,
  onNewFolder,
}: {
  menu: Exclude<AssetContextMenuState, null>;
  onClose: () => void;
  onRenameAsset: (id: string) => void;
  onRenameFolder: (path: string) => void;
  onRemoveAsset: (id: string) => void;
  onRemoveFolder: (path: string) => void;
  onOpenScene: (id: string) => void;
  onRenameScene: (id: string) => void;
  onRemoveScene: (id: string) => void;
  onNewScene: () => void;
  onNewFolder: (folderPath?: string) => void;
}) {
  const canRemoveFolder =
    menu.kind === "folder" &&
    menu.path !== ASSETS_ROOT_FOLDER &&
    !isScenesFolderOrDescendant(menu.path);

  return createPortal(
    <ul
      className="hierarchy-context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {menu.kind === "asset" ? (
        <>
          <li>
            <button
              type="button"
              onClick={() => {
                onRenameAsset(menu.id);
                onClose();
              }}
            >
              Rename
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onRemoveAsset(menu.id);
                onClose();
              }}
            >
              Remove
            </button>
          </li>
        </>
      ) : null}
      {menu.kind === "folder" &&
      menu.path !== ASSETS_ROOT_FOLDER &&
      !isScenesFolder(menu.path) ? (
        <li>
          <button
            type="button"
            onClick={() => {
              onRenameFolder(menu.path);
              onClose();
            }}
          >
            Rename
          </button>
        </li>
      ) : null}
      {canRemoveFolder ? (
        <li>
          <button
            type="button"
            onClick={() => {
              onRemoveFolder(menu.path);
              onClose();
            }}
          >
            Remove
          </button>
        </li>
      ) : null}
      {menu.kind === "scene" ? (
        <>
          <li>
            <button
              type="button"
              onClick={() => {
                onOpenScene(menu.id);
                onClose();
              }}
            >
              Open Scene
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onRenameScene(menu.id);
                onClose();
              }}
            >
              Rename
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onRemoveScene(menu.id);
                onClose();
              }}
            >
              Remove
            </button>
          </li>
        </>
      ) : null}
      {menu.kind === "folder" && isScenesFolder(menu.path) ? (
        <li>
          <button
            type="button"
            onClick={() => {
              onNewScene();
              onClose();
            }}
          >
            New Scene
          </button>
        </li>
      ) : null}
      {(menu.kind === "folder" &&
        !isScenesFolderOrDescendant(menu.path)) ||
      menu.kind === "root" ? (
        <li>
          <button
            type="button"
            onClick={() => {
              onNewFolder(menu.kind === "folder" ? menu.path : undefined);
              onClose();
            }}
          >
            New Folder
          </button>
        </li>
      ) : null}
    </ul>,
    document.body,
  );
}
