import { describe, expect, it, vi } from "vitest";
import {
  createContainerNode,
  createEmptyScene,
  createSpriteNode,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import { GameRuntime } from "./game-runtime.js";

function createMockRenderer(): SceneRenderer & {
  created: SceneNodeData[];
} {
  const created: SceneNodeData[] = [];
  return {
    created,
    createNode: vi.fn((node: SceneNodeData) => {
      created.push(node);
    }),
    updateNode: vi.fn(),
    destroyNode: vi.fn(),
    reparentNode: vi.fn(),
    clear: vi.fn(() => {
      created.length = 0;
    }),
    resize: vi.fn(),
    render: vi.fn(),
  };
}

describe("GameRuntime.loadScene", () => {
  it("creates nested nodes in depth-first order so parentId attach works", () => {
    const renderer = createMockRenderer();
    const runtime = new GameRuntime();
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const parent = createContainerNode("Parent");
    const child = createSpriteNode("Child", { x: 10, y: 20 });
    child.parentId = parent.id;
    parent.children = [child];

    const scene = createEmptyScene("Test");
    scene.nodes = [parent];

    runtime.loadScene(scene);

    expect(renderer.clear).toHaveBeenCalledTimes(1);
    expect(renderer.created.map((node) => node.name)).toEqual(["Parent", "Child"]);
    expect(renderer.created[0]?.id).toBe(parent.id);
    expect(renderer.created[1]?.parentId).toBe(parent.id);
  });
});
