import type { Editor } from "@game-editor/editor-core";
import type { ThreeSceneRenderer } from "@game-editor/renderer-three";

/**
 * Maps Three pointer / gizmo events to selection + SetTransform3DCommand.
 * One command per completed gizmo drag.
 */
export function bindThreeTransformTool(
  editor: Editor,
  renderer: ThreeSceneRenderer,
): () => void {
  renderer.setPointerHandlers({
    onBackgroundPointerDown: () => {
      editor.clearSelection();
    },
    onNodePointerDown: (nodeId) => {
      editor.selectNodes([nodeId]);
    },
    onGizmoTransformEnd: (nodeId, transform) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setTransform3D(nodeId, {
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
      });
    },
  });

  return () => {
    renderer.setPointerHandlers(undefined);
  };
}
