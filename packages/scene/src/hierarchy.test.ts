import { describe, expect, it } from "vitest";
import {
  canMoveNode,
  createEmptyScene,
  createSpriteNode,
  createTransform2D,
  getNodeLocation,
  getTransform2D,
  getWorldAff2,
  moveNodeInScene,
  parseSceneData,
  worldTransformToLocal,
  decomposeAff2ToTransform2D,
  getParentWorldAff2,
  invertAff2,
  multiplyAff2,
} from "./index.js";

function sceneWithTree() {
  const scene = createEmptyScene("H");
  const game = createSpriteNode("Game", { x: 0, y: 0 });
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

describe("hierarchy moveNodeInScene", () => {
  it("reparents and moves back to root", () => {
    const { scene, game, ui } = sceneWithTree();
    moveNodeInScene(scene, ui.id, game.id, 1);
    expect(game.children.map((n) => n.name)).toEqual(["Reels", "UI", "Effects"]);
    expect(ui.parentId).toBe(game.id);
    expect(scene.nodes.map((n) => n.name)).toEqual(["Game"]);

    moveNodeInScene(scene, ui.id, undefined, 1);
    expect(scene.nodes.map((n) => n.name)).toEqual(["Game", "UI"]);
    expect(ui.parentId).toBeUndefined();
  });

  it("reorders siblings", () => {
    const { scene, game, reels, effects } = sceneWithTree();
    moveNodeInScene(scene, effects.id, game.id, 0);
    expect(game.children.map((n) => n.id)).toEqual([effects.id, reels.id]);
  });

  it("rejects cycles", () => {
    const { scene, game, reels } = sceneWithTree();
    expect(canMoveNode(scene, game.id, reels.id)).toBe(false);
    expect(() => moveNodeInScene(scene, game.id, reels.id, 0)).toThrow(/invalid/);
    expect(canMoveNode(scene, game.id, game.id)).toBe(false);
  });

  it("serializes hierarchy after reorder", () => {
    const { scene, game, effects } = sceneWithTree();
    moveNodeInScene(scene, effects.id, game.id, 0);
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(parsed.nodes[0]?.children.map((n) => n.name)).toEqual([
      "Effects",
      "Reels",
    ]);
  });
});

describe("transform world/local", () => {
  it("preserves world pose when converting to a new parent", () => {
    const { scene, game, ui } = sceneWithTree();
    const worldBefore = getWorldAff2(scene, ui.id);
    const transform = getTransform2D(ui)!;
    const parentWorld = getParentWorldAff2(scene, game.id);
    const localAff = multiplyAff2(invertAff2(parentWorld), worldBefore);
    const local = decomposeAff2ToTransform2D(localAff, transform.id);
    ui.components = [local];
    moveNodeInScene(scene, ui.id, game.id, game.children.length);
    const worldAfter = getWorldAff2(scene, ui.id);
    expect(worldAfter.tx).toBeCloseTo(worldBefore.tx, 5);
    expect(worldAfter.ty).toBeCloseTo(worldBefore.ty, 5);
  });

  it("worldTransformToLocal matches matrix path for translation parents", () => {
    const { scene, game, ui } = sceneWithTree();
    const transform = getTransform2D(ui)!;
    const worldPose = decomposeAff2ToTransform2D(getWorldAff2(scene, ui.id), transform.id);
    const local = worldTransformToLocal(scene, game.id, worldPose);
    expect(local.position.x).toBeCloseTo(100, 5);
    expect(local.position.y).toBeCloseTo(0, 5);
  });

  it("getNodeLocation finds nested nodes", () => {
    const { scene, game, reels } = sceneWithTree();
    expect(getNodeLocation(scene, reels.id)).toMatchObject({
      parentId: game.id,
      index: 0,
    });
  });
});
