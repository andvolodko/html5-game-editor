import { useEditor } from "../editor-context";

export function HierarchyPanel() {
  const editor = useEditor();
  const nodes = editor.getScene().nodes;

  return (
    <div className="panel">
      <p className="panel-hint">Scene hierarchy (read-only shell)</p>
      {nodes.length === 0 ? (
        <p className="panel-empty">No nodes yet</p>
      ) : (
        <ul className="hierarchy-list">
          {nodes.map((node) => (
            <li key={node.id}>{node.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
