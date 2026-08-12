import { CompositeCommand } from "@game-editor/commands";
import type { Editor } from "@game-editor/editor-core";
import {
  SetTransform2DCommand,
  SetVisualComponentCommand,
} from "@game-editor/editor-core";
import type { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import { findNodeById, getTransform2D } from "@game-editor/scene";

/**
 * Editor-owned tool: maps Pixi pointer events to selection + transform commands.
 * Keeps selection/command policy out of renderer-pixi.
 * Continuous gizmo / move gestures commit one command on pointer-up.
 */
export function bindPixiTransformTool(
  editor: Editor,
  renderer: PixiSceneRenderer,
): () => void {
  renderer.setPointerHandlers({
    onBackgroundPointerDown: () => {
      editor.clearSelection();
    },
    onNodePointerDown: (nodeId) => {
      editor.selectNodes([nodeId]);
    },
    onNodePointerUp: (nodeId, start, end) => {
      if (start.x === end.x && start.y === end.y) {
        return;
      }
      editor.setTransform2D(nodeId, { position: { x: end.x, y: end.y } });
    },
    onGizmoResizeEnd: (nodeId, size) => {
      editor.setSpriteSize(nodeId, {
        width: size.width,
        height: size.height,
      });
    },
    onGizmoRotateEnd: (nodeId, rotation) => {
      editor.setTransform2D(nodeId, { rotation });
    },
    onGizmoAnchorEnd: (nodeId, result) => {
      editor.execute(
        new CompositeCommand("SetVisualAnchor", [
          new SetVisualComponentCommand(editor.document, nodeId, {
            anchor: result.anchor,
          }),
          new SetTransform2DCommand(editor.document, nodeId, {
            position: result.position,
          }),
        ]),
      );
    },
    onGizmoFlip: (nodeId, axis) => {
      const node = findNodeById(editor.getScene(), nodeId);
      const transform = node ? getTransform2D(node) : undefined;
      if (!transform) {
        return;
      }
      const current = axis === "x" ? transform.scale.x : transform.scale.y;
      const magnitude = Math.abs(current) || 1;
      const nextSigned = current < 0 ? magnitude : -magnitude;
      const scale =
        axis === "x"
          ? { x: nextSigned, y: transform.scale.y }
          : { x: transform.scale.x, y: nextSigned };
      editor.setTransform2D(nodeId, { scale });
    },
  });

  return () => {
    renderer.setPointerHandlers(undefined);
  };
}
