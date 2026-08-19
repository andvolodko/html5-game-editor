import { CompositeCommand } from "@game-editor/commands";
import {
  isToggleSelectionKey,
  SetTransform2DCommand,
  SetVisualComponentCommand,
  type Editor,
} from "@game-editor/editor-core";
import type { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import { findNodeById, getTransform2D } from "@game-editor/scene";
import { createPixiMarqueeGesture } from "./pixi-marquee-tool";
import { createPixiTilemapGesture } from "./pixi-tilemap-tool";

/**
 * Editor-owned tool: maps Pixi pointer events to selection + transform commands.
 * Keeps selection/command policy out of renderer-pixi.
 * Continuous gizmo / move gestures commit one command on pointer-up.
 * Dragging an already-selected node moves the whole selection.
 */
export function bindPixiTransformTool(
  editor: Editor,
  renderer: PixiSceneRenderer,
): () => void {
  const tilemap = createPixiTilemapGesture(editor);
  const marquee = createPixiMarqueeGesture(editor, renderer);
  renderer.setPointerHandlers({
    onWorldPointerDown: (world, button, modifiers, client) => {
      if (tilemap.onWorldPointerDown(world, button)) {
        return true;
      }
      return marquee.onWorldPointerDown(world, button, modifiers, client);
    },
    onWorldPointerMove: (world) => {
      tilemap.onWorldPointerMove(world);
      marquee.onWorldPointerMove(world);
    },
    onWorldPointerUp: (world) => {
      tilemap.onWorldPointerUp();
      marquee.onWorldPointerUp(world);
    },
    onBackgroundPointerDown: () => {
      editor.clearSelection();
    },
    onNodePointerDown: (nodeId, _world, modifiers) => {
      if (modifiers && isToggleSelectionKey(modifiers)) {
        editor.toggleNodeSelection(nodeId);
        return;
      }
      if (!editor.selection.getSelectedNodeIds().includes(nodeId)) {
        editor.selectNodes([nodeId]);
      }
    },
    onNodePointerUp: (moves) => {
      editor.setNodePositions(
        moves.map((move) => ({
          nodeId: move.nodeId,
          position: { x: move.end.x, y: move.end.y },
        })),
      );
    },
    onGizmoResizeEnd: (nodeId, size) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setVisualComponent(nodeId, {
        width: size.width,
        height: size.height,
      });
    },
    onGizmoRotateEnd: (nodeId, rotation) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setTransform2D(nodeId, { rotation });
    },
    onGizmoScaleEnd: (nodeId, scale) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setTransform2D(nodeId, { scale });
    },
    onGizmoAnchorEnd: (nodeId, result) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
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
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
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
    onHitZoneResizeEnd: (nodeId, hitZone) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setHitZone(nodeId, {
        offset: hitZone.offset,
        shape: hitZone.shape,
        enabled: hitZone.enabled,
      });
    },
    onMaskResizeEnd: (nodeId, mask) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setMask(nodeId, {
        offset: mask.offset,
        shape: mask.shape,
        enabled: mask.enabled,
        inverse: mask.inverse,
        mode: mask.mode,
        assetId: mask.assetId,
        width: mask.width,
        height: mask.height,
      });
    },
    onGraphicsPolygonEnd: (nodeId, shape) => {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      editor.setVisualComponent(nodeId, { shape });
    },
  });

  return () => {
    renderer.setPointerHandlers(undefined);
  };
}
