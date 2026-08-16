import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  createTransform2D,
} from "@game-editor/scene";
import {
  hierarchyDragNodeIds,
  isNoOpMove,
  placementFromRowOffset,
  resolveHierarchyDrop,
  resolveHierarchyMultiDrop,
} from "./hierarchy-dnd.js";
import { Editor, MoveNodeCommand } from "./index.js";

function sceneWithTree() {
  const scene = createEmptyScene("H");
  const game = createSpriteNode("Game", { x: 100, y: 0 });
  game.components = [createTransform2D({ position: { x: 100, y: 0 } })];
  const reels = createSpriteNode("Reels", { x: 10, y: 0 });
  reels.parentId = game.id;
  const effects = createSpriteNode("Effects", { x: 20, y: 0 });
  effects.parentId = game.id;
  game.children = [reels, effects];
  const ui = createSpriteNode("UI", { x: 200, y: 0 });
  scene.nodes = [game, ui];
  return { scene, game, reels, effects, ui };
}

describe("resolveHierarchyDrop", () => {
  it("resolves inside / before / after / root", () => {
    const { scene, game, reels, ui } = sceneWithTree();
    expect(
      resolveHierarchyDrop({
        scene,
        draggedId: ui.id,
        targetId: game.id,
        placement: "inside",
      }),
    ).toEqual({ toParentId: game.id, toIndex: 2 });

    expect(
      resolveHierarchyDrop({
        scene,
        draggedId: ui.id,
        targetId: reels.id,
        placement: "before",
      }),
    ).toEqual({ toParentId: game.id, toIndex: 0 });

    expect(
      resolveHierarchyDrop({
        scene,
        draggedId: ui.id,
        targetId: reels.id,
        placement: "after",
      }),
    ).toEqual({ toParentId: game.id, toIndex: 1 });

    expect(
      resolveHierarchyDrop({
        scene,
        draggedId: reels.id,
        placement: "root",
      }),
    ).toEqual({ toParentId: undefined, toIndex: 2 });
  });

  it("rejects cycles", () => {
    const { scene, game, reels } = sceneWithTree();
    expect(
      resolveHierarchyDrop({
        scene,
        draggedId: game.id,
        targetId: reels.id,
        placement: "inside",
      }),
    ).toBeUndefined();
  });

  it("detects no-op sibling slots", () => {
    expect(isNoOpMove("p", 1, "p", 1)).toBe(true);
    expect(isNoOpMove("p", 1, "p", 2)).toBe(false);
    expect(isNoOpMove("p", 1, "q", 1)).toBe(false);
  });

  it("maps row offsets to placements", () => {
    expect(placementFromRowOffset(2, 20)).toBe("before");
    expect(placementFromRowOffset(10, 20)).toBe("inside");
    expect(placementFromRowOffset(18, 20)).toBe("after");
  });
});

describe("resolveHierarchyMultiDrop", () => {
  it("moves root-most nodes in tree order as consecutive siblings", () => {
    const { scene, game, ui } = sceneWithTree();
    const extra = createSpriteNode("Extra", { x: 300, y: 0 });
    extra.components = [createTransform2D({ position: { x: 300, y: 0 } })];
    scene.nodes.push(extra);

    const moves = resolveHierarchyMultiDrop({
      scene,
      draggedIds: [extra.id, ui.id],
      targetId: game.id,
      placement: "inside",
    });
    expect(moves?.map((move) => move.nodeId)).toEqual([ui.id, extra.id]);
    expect(moves?.[0]).toEqual({
      nodeId: ui.id,
      toParentId: game.id,
      toIndex: 2,
    });
    expect(moves?.[1]).toEqual({
      nodeId: extra.id,
      toParentId: game.id,
      toIndex: 3,
    });
  });

  it("drops parent+child as the parent only", () => {
    const { scene, game, reels, ui } = sceneWithTree();
    const moves = resolveHierarchyMultiDrop({
      scene,
      draggedIds: [game.id, reels.id],
      targetId: ui.id,
      placement: "after",
    });
    expect(moves?.map((move) => move.nodeId)).toEqual([game.id]);
  });

  it("stacks a sibling after a no-op first node", () => {
    const { scene, game, ui } = sceneWithTree();
    const other = createSpriteNode("Other", { x: 250, y: 0 });
    other.components = [createTransform2D({ position: { x: 250, y: 0 } })];
    const extra = createSpriteNode("Extra", { x: 300, y: 0 });
    extra.components = [createTransform2D({ position: { x: 300, y: 0 } })];
    scene.nodes.push(other, extra);

    // ui is already immediately after game — first move is a no-op; extra still
    // stacks after ui ( ahead of `other` ).
    const moves = resolveHierarchyMultiDrop({
      scene,
      draggedIds: [ui.id, extra.id],
      targetId: game.id,
      placement: "after",
    });
    expect(moves?.map((move) => move.nodeId)).toEqual([extra.id]);
    expect(moves?.[0]).toEqual({
      nodeId: extra.id,
      toParentId: undefined,
      toIndex: 2,
    });
  });
});

describe("hierarchyDragNodeIds", () => {
  it("drags the whole selection when the grabbed node is selected", () => {
    expect(hierarchyDragNodeIds("b", ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(hierarchyDragNodeIds("z", ["a", "b"])).toEqual(["z"]);
  });
});

describe("Editor.moveNodes", () => {
  it("moves several nodes as one undo step", () => {
    const { scene, game, ui } = sceneWithTree();
    const extra = createSpriteNode("Extra", { x: 300, y: 0 });
    extra.components = [createTransform2D({ position: { x: 300, y: 0 } })];
    scene.nodes.push(extra);
    const editor = new Editor({ scene });
    const moves = resolveHierarchyMultiDrop({
      scene: editor.getScene(),
      draggedIds: [ui.id, extra.id],
      targetId: game.id,
      placement: "inside",
    });
    expect(moves).toBeDefined();
    editor.moveNodes(moves!);
    expect(editor.getScene().nodes[0]?.children.map((node) => node.name)).toEqual([
      "Reels",
      "Effects",
      "UI",
      "Extra",
    ]);
    editor.undo();
    expect(editor.getScene().nodes.map((node) => node.name)).toEqual([
      "Game",
      "UI",
      "Extra",
    ]);
  });
});

describe("MoveNodeCommand", () => {
  it("reparents with undo/redo and preserves world X", () => {
    const { scene, game, ui } = sceneWithTree();
    const editor = new Editor({ scene });
    const beforeX = 200;

    editor.execute(
      new MoveNodeCommand(editor.document, {
        nodeId: ui.id,
        toParentId: game.id,
        toIndex: 2,
      }),
    );

    const moved = editor.getScene().nodes[0]?.children.find((n) => n.id === ui.id);
    expect(moved?.parentId).toBe(game.id);
    const local = moved?.components.find((c) => c.type === "Transform2D");
    expect(local && "position" in local ? local.position.x : undefined).toBeCloseTo(
      beforeX - 100,
      5,
    );

    editor.undo();
    expect(editor.getScene().nodes.map((n) => n.name)).toEqual(["Game", "UI"]);
    editor.redo();
    expect(editor.getScene().nodes[0]?.children.map((n) => n.name)).toContain("UI");
  });

  it("reorders siblings with exact index restore", () => {
    const { scene, game, effects } = sceneWithTree();
    const editor = new Editor({ scene });
    editor.execute(
      new MoveNodeCommand(editor.document, {
        nodeId: effects.id,
        toParentId: game.id,
        toIndex: 0,
        preserveWorldTransform: true,
      }),
    );
    expect(editor.getScene().nodes[0]?.children.map((n) => n.name)).toEqual([
      "Effects",
      "Reels",
    ]);
    editor.undo();
    expect(editor.getScene().nodes[0]?.children.map((n) => n.name)).toEqual([
      "Reels",
      "Effects",
    ]);
  });
});
