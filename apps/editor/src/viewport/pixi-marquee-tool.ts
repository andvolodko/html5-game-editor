import {
  applyMarqueeSelection,
  isToggleSelectionKey,
  type Editor,
} from "@game-editor/editor-core";
import {
  POINTER_CLICK_MAX_MOVE_PX,
  type PixiSceneRenderer,
} from "@game-editor/renderer-pixi";
import {
  aabbFromCorners,
  nodesIntersectingWorldAabb,
  type Vec2,
} from "@game-editor/scene";
import {
  MOUSE_BUTTON_PRIMARY,
  type ViewportPointerModifiers,
} from "@game-editor/shared";

interface MarqueeStroke {
  start: Vec2;
  additive: boolean;
}

/**
 * Rubber-band select in the Scene viewport. Consumes empty-space primary
 * drags so they do not clear selection until the gesture ends.
 */
export function createPixiMarqueeGesture(
  editor: Editor,
  renderer: PixiSceneRenderer,
): {
  onWorldPointerDown(
    world: Vec2,
    button: number,
    modifiers: ViewportPointerModifiers,
    client: { x: number; y: number },
  ): boolean;
  onWorldPointerMove(world: Vec2): void;
  onWorldPointerUp(world: Vec2): void;
} {
  let stroke: MarqueeStroke | undefined;

  const clearOverlay = () => {
    renderer.setMarqueeWorldRect(undefined);
  };

  return {
    onWorldPointerDown(world, button, modifiers, client) {
      if (button !== MOUSE_BUTTON_PRIMARY) {
        return false;
      }
      if (renderer.pickNodeId(client.x, client.y)) {
        return false;
      }
      stroke = {
        start: { ...world },
        additive: isToggleSelectionKey(modifiers) || modifiers.shiftKey,
      };
      clearOverlay();
      return true;
    },
    onWorldPointerMove(world) {
      if (!stroke) {
        return;
      }
      const rect = aabbFromCorners(stroke.start, world);
      if (!isMarqueeDrag(stroke.start, world, renderer)) {
        clearOverlay();
        return;
      }
      renderer.setMarqueeWorldRect(rect);
    },
    onWorldPointerUp(world) {
      if (!stroke) {
        return;
      }
      const finished = stroke;
      stroke = undefined;
      clearOverlay();
      if (!isMarqueeDrag(finished.start, world, renderer)) {
        if (!finished.additive) {
          editor.clearSelection();
        }
        return;
      }
      const hits = nodesIntersectingWorldAabb(
        editor.getScene(),
        aabbFromCorners(finished.start, world),
        (node) =>
          renderer.hasNode(node.id) && editor.isNodeEffectivelyVisible(node.id),
      );
      const next = applyMarqueeSelection(
        editor.selection.getSelectedNodeIds(),
        hits,
        finished.additive,
      );
      if (next.length === 0) {
        editor.clearSelection();
        return;
      }
      editor.selectNodes(next);
    },
  };
}

function isMarqueeDrag(
  start: Vec2,
  end: Vec2,
  renderer: PixiSceneRenderer,
): boolean {
  const scale = renderer.getViewportCamera().scale;
  const threshold =
    POINTER_CLICK_MAX_MOVE_PX / (Math.abs(scale) < 1e-9 ? 1 : Math.abs(scale));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return dx * dx + dy * dy > threshold * threshold;
}
