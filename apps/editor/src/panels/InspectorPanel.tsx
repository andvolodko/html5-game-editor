import { useEditor } from "../editor-context";

export function InspectorPanel() {
  const editor = useEditor();
  const selected = editor.selection.getSelectedNodeIds();

  return (
    <div className="panel">
      <p className="panel-hint">Inspector shell</p>
      {selected.length === 0 ? (
        <p className="panel-empty">Nothing selected</p>
      ) : (
        <p>{selected.length} node(s) selected</p>
      )}
    </div>
  );
}
