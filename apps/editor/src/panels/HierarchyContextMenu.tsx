import { EditorContextMenu } from "../ui/EditorContextMenu";
import type { HierarchyContextMenuState } from "./hierarchy-types";

export function HierarchyContextMenu({
  menu,
  onAction,
}: {
  menu: HierarchyContextMenuState;
  onAction: (action: string) => void;
}) {
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
