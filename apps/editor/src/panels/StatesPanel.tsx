import { useEffect, useState } from "react";
import { BASE_NODE_STATE_ID } from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { EditorContextMenu } from "../ui/EditorContextMenu";

export function StatesPanel() {
  const editor = useEditor();
  const states = useEditorState((ed) => ed.getSceneStates());
  const activeId = useEditorState((ed) => ed.nodeStates.getActiveStateId());
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    stateId: string;
  } | null>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = () => setMenu(null);
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
  }, [menu]);

  const commitRename = () => {
    if (!renameId) {
      return;
    }
    const trimmed = renameDraft.trim();
    if (trimmed.length > 0) {
      editor.renameSceneState(renameId, trimmed);
    }
    setRenameId(null);
  };

  return (
    <div className="panel panel-states">
      <div className="states-toolbar">
        <button
          type="button"
          className="scene-toolbar-btn"
          onClick={() => {
            const id = editor.addSceneState({ name: "State" });
            editor.setActiveNodeState(id);
            setRenameId(id);
            setRenameDraft("State");
          }}
        >
          + Add State
        </button>
        <button
          type="button"
          className="scene-toolbar-btn"
          onClick={() => editor.ensurePortraitLandscapeStates()}
          title="Add Portrait and Landscape if missing"
        >
          Portrait / Landscape
        </button>
      </div>
      <ul className="states-list">
        <li>
          <button
            type="button"
            className={
              activeId === BASE_NODE_STATE_ID
                ? "states-item states-item-active"
                : "states-item"
            }
            onClick={() => editor.setActiveNodeState(BASE_NODE_STATE_ID)}
          >
            <span className="states-item-marker" aria-hidden>
              {activeId === BASE_NODE_STATE_ID ? "●" : "○"}
            </span>
            Base
          </button>
        </li>
        {states.map((state) => (
          <li key={state.id}>
            {renameId === state.id ? (
              <input
                className="states-rename-input"
                value={renameDraft}
                autoFocus
                onChange={(event) => setRenameDraft(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitRename();
                  }
                  if (event.key === "Escape") {
                    setRenameId(null);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className={
                  activeId === state.id
                    ? "states-item states-item-active"
                    : "states-item"
                }
                onClick={() => editor.setActiveNodeState(state.id)}
                onDoubleClick={() => {
                  setRenameId(state.id);
                  setRenameDraft(state.name);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({
                    x: event.clientX,
                    y: event.clientY,
                    stateId: state.id,
                  });
                }}
              >
                <span className="states-item-marker" aria-hidden>
                  {activeId === state.id ? "●" : "○"}
                </span>
                <span className="states-item-name">{state.name}</span>
                {state.viewport ? (
                  <span className="states-item-viewport">
                    {state.viewport.width}×{state.viewport.height}
                  </span>
                ) : null}
              </button>
            )}
          </li>
        ))}
      </ul>
      {states.length === 0 ? (
        <p className="panel-empty">
          No named states. Base uses normal node values.
        </p>
      ) : null}
      {menu ? (
        <EditorContextMenu x={menu.x} y={menu.y}>
          <li>
            <button
              type="button"
              onClick={() => {
                const entry = states.find((s) => s.id === menu.stateId);
                if (entry) {
                  setRenameId(entry.id);
                  setRenameDraft(entry.name);
                }
                setMenu(null);
              }}
            >
              Rename
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                const id = editor.duplicateSceneState(menu.stateId);
                if (id) {
                  editor.setActiveNodeState(id);
                }
                setMenu(null);
              }}
            >
              Duplicate
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                editor.deleteSceneState(menu.stateId);
                setMenu(null);
              }}
            >
              Delete
            </button>
          </li>
        </EditorContextMenu>
      ) : null}
    </div>
  );
}
