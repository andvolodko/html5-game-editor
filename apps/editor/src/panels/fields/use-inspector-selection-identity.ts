import { useEditorState } from "../../hooks/useEditorState";

/**
 * Identity for Inspector blur-commit fields. Hierarchy selects on pointerdown,
 * then the focused input blurs — so commit targets must stay on the previous
 * identity until after paint (`useEffect`), not during the selection render.
 */
export function useInspectorSelectionIdentity(): string {
  return useEditorState((editor) => {
    if (editor.selection.isSceneSelected()) {
      return `scene:${editor.getScene().id}`;
    }
    const nodeId = editor.selection.getPrimaryNodeId() ?? "";
    const stateId = editor.nodeStates.getActiveStateId();
    return `node:${nodeId}:${stateId}`;
  });
}
