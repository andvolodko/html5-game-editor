import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  EMPTY_TILE,
  getTile,
  getTilemap,
} from "@game-editor/scene";
import { Editor } from "../editor.js";
import { CreateNodeCommand } from "./create-node-command.js";
import { PaintTilemapCommand } from "./paint-tilemap-command.js";

describe("PaintTilemapCommand", () => {
  it("paints multiple cells in one undo step", () => {
    const editor = new Editor({ scene: createEmptyScene("Tiles") });
    const create = new CreateNodeCommand(editor.document, editor.selection, {
      typeId: "pixi.tilemap",
      name: "Ground",
    });
    editor.execute(create);
    const tilemap = getTilemap(editor.getScene().nodes[0]!);
    const layerId = tilemap!.layers[0]!.id;
    const command = new PaintTilemapCommand(editor.document, create.createdNodeId, [
      { layerId, x: 0, y: 0, before: EMPTY_TILE, after: 1 },
      { layerId, x: 1, y: 0, before: EMPTY_TILE, after: 2 },
      { layerId, x: 0, y: 1, before: EMPTY_TILE, after: 3 },
    ]);
    editor.execute(command);
    const painted = getTilemap(editor.getScene().nodes[0]!)!;
    expect(getTile(painted, layerId, 0, 0)).toBe(1);
    expect(getTile(painted, layerId, 1, 0)).toBe(2);
    expect(getTile(painted, layerId, 0, 1)).toBe(3);

    editor.undo();
    const undone = getTilemap(editor.getScene().nodes[0]!)!;
    expect(getTile(undone, layerId, 0, 0)).toBe(EMPTY_TILE);
    expect(getTile(undone, layerId, 1, 0)).toBe(EMPTY_TILE);
    expect(getTile(undone, layerId, 0, 1)).toBe(EMPTY_TILE);

    editor.redo();
    const redone = getTilemap(editor.getScene().nodes[0]!)!;
    expect(getTile(redone, layerId, 0, 0)).toBe(1);
    expect(getTile(redone, layerId, 1, 0)).toBe(2);
    expect(getTile(redone, layerId, 0, 1)).toBe(3);
  });

  it("records an already-applied stroke without painting twice", () => {
    const editor = new Editor({ scene: createEmptyScene("Tiles") });
    const create = new CreateNodeCommand(editor.document, editor.selection, {
      typeId: "pixi.tilemap",
      name: "Ground",
    });
    editor.execute(create);
    const nodeId = create.createdNodeId;
    const tilemap = getTilemap(editor.getScene().nodes[0]!)!;
    const layerId = tilemap.layers[0]!.id;
    const changes = [
      { layerId, x: 0, y: 0, before: EMPTY_TILE, after: 9 },
    ];
    editor.document.applyTilemapChanges(nodeId, changes, "after");
    expect(getTile(getTilemap(editor.getScene().nodes[0]!)!, layerId, 0, 0)).toBe(
      9,
    );
    editor.paintTilemap(nodeId, changes, { alreadyApplied: true });
    expect(getTile(getTilemap(editor.getScene().nodes[0]!)!, layerId, 0, 0)).toBe(
      9,
    );
    editor.undo();
    expect(getTile(getTilemap(editor.getScene().nodes[0]!)!, layerId, 0, 0)).toBe(
      EMPTY_TILE,
    );
  });
});
