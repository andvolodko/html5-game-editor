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
  const flags =
    node !== undefined ? editor.getEditorNodeFlags(node.id) : undefined;
  const locked = flags?.effectivelyLocked === true;
  const hasChildren = node !== undefined && node.children.length > 0;

  return (
    <EditorContextMenu x={menu.x} y={menu.y}>
      {typeof menu.target === "object" && node && flags ? (
        <>
          <li>
            <button
              type="button"
              disabled={locked}
              title={locked ? "Unlock the node to create a child" : undefined}
              onClick={() => onAction("create-child")}
            >
              Create Child
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={locked}
              title={locked ? "Unlock the node to rename it" : undefined}
              onClick={() => onAction("rename")}
            >
              Rename
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={locked}
              title={locked ? "Unlock the node to duplicate it" : undefined}
              onClick={() => onAction("duplicate")}
            >
              Duplicate
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={locked}
              title={locked ? "Unlock the node to delete it" : undefined}
              onClick={() => onAction("delete")}
            >
              Delete
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onAction(flags.ownHidden ? "show" : "hide")}
            >
              {flags.ownHidden ? "Show in Editor" : "Hide in Editor"}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onAction(flags.ownLocked ? "unlock" : "lock")}
            >
              {flags.ownLocked ? "Unlock" : "Lock"}
            </button>
          </li>
          {hasChildren ? (
            <>
              <li>
                <button type="button" onClick={() => onAction("hide-children")}>
                  Hide Children
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onAction("show-children")}>
                  Show Children
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onAction("lock-children")}>
                  Lock Children
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onAction("unlock-children")}
                >
                  Unlock Children
                </button>
              </li>
            </>
          ) : null}
          {!isInherited ? (
            <li>
              <button
                type="button"
                disabled={locked}
                title={locked ? "Unlock the node to create a prefab" : undefined}
                onClick={() => onAction("create-prefab")}
              >
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
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onAction("apply-all")}
                >
                  Apply All
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onAction("revert-all")}
                >
                  Revert All
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onAction("unpack")}
                >
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
          <li>
            <button type="button" onClick={() => onAction("show-all")}>
              Show All
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("hide-all")}>
              Hide All
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("lock-all")}>
              Lock All
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onAction("unlock-all")}>
              Unlock All
            </button>
          </li>
        </>
      )}
    </EditorContextMenu>
  );
}
