import type { Editor } from "@game-editor/editor-core";
import {
  EMPTY_TILE,
  findNodeById,
  getTile,
  getTilemap,
  primaryTilemapLayer,
  worldToTile,
  type TileChange,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";

interface TilemapStroke {
  nodeId: string;
  layerId: string;
  changes: TileChange[];
  seen: Set<string>;
}

/**
 * Viewport tile paint/erase/picker. One stroke = one history command.
 * Lives in the editor app so renderer-pixi stays interaction-policy free.
 */
export function createPixiTilemapGesture(editor: Editor): {
  onWorldPointerDown(world: Vec2, button: number): boolean;
  onWorldPointerMove(world: Vec2): void;
  onWorldPointerUp(): void;
} {
  let stroke: TilemapStroke | undefined;

  const paintAt = (world: Vec2): void => {
    if (!stroke) {
      return;
    }
    const node = findNodeById(editor.getScene(), stroke.nodeId);
    const tilemap = node ? getTilemap(node) : undefined;
    if (!tilemap) {
      return;
    }
    const tile = worldToTile(editor.getScene(), stroke.nodeId, tilemap, world);
    const cellKey = `${String(tile.x)},${String(tile.y)}`;
    if (stroke.seen.has(cellKey)) {
      return;
    }
    const tool = editor.tilemapEdit.getTool();
    const after =
      tool === "erase" ? EMPTY_TILE : editor.tilemapEdit.getSelectedTileId();
    const before = getTile(tilemap, stroke.layerId, tile.x, tile.y);
    if (before === after) {
      return;
    }
    stroke.seen.add(cellKey);
    const change: TileChange = {
      layerId: stroke.layerId,
      x: tile.x,
      y: tile.y,
      before,
      after,
    };
    stroke.changes.push(change);
    editor.document.applyTilemapChanges(stroke.nodeId, [change], "after");
  };

  return {
    onWorldPointerDown(world, button) {
      if (button !== MOUSE_BUTTON_PRIMARY) {
        return false;
      }
      const nodeId = editor.selection.getSelectedNodeIds().at(-1);
      if (!nodeId) {
        return false;
      }
      const node = findNodeById(editor.getScene(), nodeId);
      const tilemap = node ? getTilemap(node) : undefined;
      const layer = tilemap ? primaryTilemapLayer(tilemap) : undefined;
      if (!tilemap || !layer || editor.isNodeEffectivelyLocked(nodeId)) {
        return false;
      }
      const tool = editor.tilemapEdit.getTool();
      if (tool === "picker") {
        const tile = worldToTile(editor.getScene(), nodeId, tilemap, world);
        const picked = getTile(tilemap, layer.id, tile.x, tile.y);
        if (picked !== EMPTY_TILE) {
          editor.tilemapEdit.setSelectedTileId(picked);
        }
        return true;
      }
      stroke = {
        nodeId,
        layerId: layer.id,
        changes: [],
        seen: new Set(),
      };
      paintAt(world);
      return true;
    },
    onWorldPointerMove(world) {
      paintAt(world);
    },
    onWorldPointerUp() {
      if (!stroke) {
        return;
      }
      const { nodeId, changes } = stroke;
      stroke = undefined;
      editor.paintTilemap(nodeId, changes, { alreadyApplied: true });
    },
  };
}
