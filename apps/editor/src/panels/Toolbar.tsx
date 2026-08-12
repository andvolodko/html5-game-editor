import { useEditor } from "../editor-context";

export function Toolbar() {
  const editor = useEditor();
  const scene = editor.getScene();

  return (
    <header className="toolbar">
      <div className="toolbar-brand">HTML5 Game Editor</div>
      <div className="toolbar-meta">
        <span>{scene.name}</span>
        <span className="toolbar-sep">·</span>
        <span>{editor.getDirtyState() === "clean" ? "Saved" : "Unsaved"}</span>
      </div>
      <div className="toolbar-actions">
        <button type="button" disabled title="Coming soon">
          Undo
        </button>
        <button type="button" disabled title="Coming soon">
          Redo
        </button>
        <button type="button" disabled title="Coming soon">
          Save
        </button>
      </div>
    </header>
  );
}
