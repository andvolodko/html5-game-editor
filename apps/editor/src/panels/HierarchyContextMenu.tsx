import {
  findNodeById,
  isInheritedPrefabNode,
  isPrefabInstanceRoot,
} from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { EditorContextMenu } from "../ui/EditorContextMenu";
import type { HierarchyContextMenuState } from "./hierarchy-types";

export function HierarchyContextMenu({
  menu,
  onAction,
}: {
  menu: HierarchyContextMenuState;
  onAction: (action: string) => void;
}) {
  const editor = useEditor();
  const node =
    typeof menu.target === "object"
      ? findNodeById(editor.getScene(), menu.target.nodeId)
      : undefined;
  const isInstanceRoot = node !== undefined && isPrefabInstanceRoot(node);
  const isInherited = node !== undefined && isInheritedPrefabNode(node);

  return (
    <EditorContextMenu x={menu.x} y={menu.y}>
      {typeof menu.target === "object" ? (
        <>
          <li>
            <button type="button" onClick={() => onAction("create-child")}>
              Create Child
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("rename")}>
              Rename
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("duplicate")}>
              Duplicate
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("delete")}>
              Delete
            </button>
          </li>
          {!isInherited ? (
            <li>
              <button type="button" onClick={() => onAction("create-prefab")}>
                Create Prefab
              </button>
            </li>
          ) : null}
          {isInstanceRoot || isInherited ? (
            <li>
              <button type="button" onClick={() => onAction("open-prefab")}>
                Open Prefab
              </button>
            </li>
          ) : null}
          {isInstanceRoot ? (
            <>
              <li>
                <button type="button" onClick={() => onAction("select-prefab-asset")}>
                  Select Prefab Asset
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onAction("apply-all")}>
                  Apply All
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onAction("revert-all")}>
                  Revert All
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onAction("unpack")}>
                  Unpack
                </button>
              </li>
            </>
          ) : null}
        </>
      ) : (
        <>
          <li>
            <button type="button" onClick={() => onAction("create-root")}>
              Create Node
            </button>
          </li>
          {menu.target === "scene" ? (
            <li>
              <button type="button" onClick={() => onAction("rename-scene")}>
                Rename Scene
              </button>
            </li>
          ) : null}
        </>
      )}
    </EditorContextMenu>
  );
}
