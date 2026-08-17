import {
  ASSETS_ROOT_FOLDER,
  isScenesFolder,
  isScenesFolderOrDescendant,
} from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { EditorContextMenu } from "../ui/EditorContextMenu";

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
  onDuplicateAsset,
  onRemoveFolder,
  onOpenScene,
  onRenameScene,
  onRemoveScene,
  onDuplicateScene,
  onNewScene,
  onNewFolder,
  onOpenPrefab,
  onInstantiatePrefab,
  onCreateTileSet,
}: {
  menu: Exclude<AssetContextMenuState, null>;
  onClose: () => void;
  onRenameAsset: (id: string) => void;
  onRenameFolder: (path: string) => void;
  onRemoveAsset: (id: string) => void;
  onDuplicateAsset: (id: string) => void;
  onRemoveFolder: (path: string) => void;
  onOpenScene: (id: string) => void;
  onRenameScene: (id: string) => void;
  onRemoveScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
  onNewScene: () => void;
  onNewFolder: (folderPath?: string) => void;
  onOpenPrefab: (id: string) => void;
  onInstantiatePrefab: (id: string) => void;
  onCreateTileSet: (id: string) => void;
}) {
  const editor = useEditor();
  const menuAsset =
    menu.kind === "asset" ? editor.assets.get(menu.id) : undefined;
  const isPrefab = menuAsset?.type === "prefab";
  const isTexture = menuAsset?.type === "texture";
  const canRemoveFolder =
    menu.kind === "folder" &&
    menu.path !== ASSETS_ROOT_FOLDER &&
    !isScenesFolderOrDescendant(menu.path);

  return (
    <EditorContextMenu x={menu.x} y={menu.y}>
      {menu.kind === "asset" ? (
        <>
          {isPrefab ? (
            <>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPrefab(menu.id);
                    onClose();
                  }}
                >
                  Open
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onInstantiatePrefab(menu.id);
                    onClose();
                  }}
                >
                  Instantiate
                </button>
              </li>
            </>
          ) : null}
          {isTexture ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onCreateTileSet(menu.id);
                  onClose();
                }}
              >
                Create TileSet
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => {
                onDuplicateAsset(menu.id);
                onClose();
              }}
            >
              Duplicate
            </button>
          </li>
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
                onDuplicateScene(menu.id);
                onClose();
              }}
            >
              Duplicate
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
    </EditorContextMenu>
  );
}
