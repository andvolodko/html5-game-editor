import { describe, expect, it, vi } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  getTransform2D,
  insertNodeInScene,
  type SceneRenderer,
} from "@game-editor/scene";
import {
  applyRuntimeNodeStateDisplay,
  resolveSceneStateId,
} from "./apply-runtime-node-state.js";

function createMockRenderer(): SceneRenderer & {
  transforms: Map<string, { x: number; y: number; rotation: number; scaleX: number; scaleY: number }>;
  alphas: Map<string, number>;
  visibles: Map<string, boolean>;
} {
  const transforms = new Map();
  const alphas = new Map();
  const visibles = new Map();
  return {
    transforms,
    alphas,
    visibles,
    createNode() {},
    updateNode() {},
    syncTransform() {},
    destroyNode() {},
    reparentNode() {},
    clear() {},
    resize() {},
    render() {},
    getRuntimeTransform2D(nodeId: string) {
      let t = transforms.get(nodeId);
      if (!t) {
        t = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        transforms.set(nodeId, t);
      }
      return t;
    },
    setNodeAlpha(nodeId, alpha) {
      alphas.set(nodeId, alpha);
    },
    setNodeResolvedVisible(nodeId, visible) {
      visibles.set(nodeId, visible);
    },
  };
}

describe("applyRuntimeNodeStateDisplay", () => {
  it("restores Base channels when switching Damaged → Selected", () => {
    const scene = createEmptyScene("Main");
    const sprite = createSpriteNode("Hero", { x: 0, y: 0 });
    getTransform2D(sprite)!.scale = { x: 1, y: 1 };
    sprite.alpha = 1;
    scene.states = [
      { id: "state_damaged", name: "Damaged" },
      { id: "state_selected", name: "Selected" },
    ];
    sprite.stateOverrides = {
      state_damaged: { alpha: 0.5 },
      state_selected: {
        transform2D: { scale: { x: 1.2, y: 1.2 } },
      },
    };
    insertNodeInScene(scene, sprite, undefined, 0);

    const renderer = createMockRenderer();
    // Seed live transform from Base
    const live = renderer.getRuntimeTransform2D!(sprite.id)!;
    live.x = 0;
    live.y = 0;
    live.scaleX = 1;
    live.scaleY = 1;

    applyRuntimeNodeStateDisplay(renderer, sprite, "state_damaged");
    expect(renderer.alphas.get(sprite.id)).toBe(0.5);
    expect(live.scaleX).toBe(1);

    applyRuntimeNodeStateDisplay(renderer, sprite, "state_selected");
    expect(renderer.alphas.get(sprite.id)).toBe(1);
    expect(live.scaleX).toBe(1.2);
    expect(live.scaleY).toBe(1.2);

    // Authored Base unchanged
    expect(sprite.alpha).toBe(1);
    expect(getTransform2D(sprite)?.scale).toEqual({ x: 1, y: 1 });
  });

  it("resolves state by unique name", () => {
    const scene = createEmptyScene("Main");
    scene.states = [{ id: "state_portrait", name: "Portrait" }];
    expect(resolveSceneStateId(scene, "Portrait")).toBe("state_portrait");
    expect(resolveSceneStateId(scene, "state_portrait")).toBe("state_portrait");
    expect(resolveSceneStateId(scene, "Missing")).toBeUndefined();
  });
});

void vi;
