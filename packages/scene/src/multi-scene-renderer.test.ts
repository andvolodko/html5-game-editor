import { describe, expect, it, vi } from "vitest";
import {
  createEmptyScene,
  createNodeWithTransform3D,
  createNodeWithVisual,
  createSpriteComponent,
  MultiSceneRenderer,
  nodeBelongsToPixiBackground,
  nodeBelongsToThree,
  type SceneNodeData,
  type SceneRenderer,
} from "./index.js";

function createMockRenderer(): SceneRenderer & {
  created: string[];
  nodes: Set<string>;
} {
  const created: string[] = [];
  const nodes = new Set<string>();
  return {
    created,
    nodes,
    hasNode: (id) => nodes.has(id),
    createNode: vi.fn((node: SceneNodeData) => {
      created.push(node.id);
      nodes.add(node.id);
    }),
    updateNode: vi.fn(),
    syncTransform: vi.fn(),
    destroyNode: vi.fn((id: string) => {
      nodes.delete(id);
    }),
    reparentNode: vi.fn(),
    clear: vi.fn(() => nodes.clear()),
    resize: vi.fn(),
    render: vi.fn(),
  };
}

describe("MultiSceneRenderer", () => {
  it("routes nodes by accepts filter", () => {
    const pixi = createMockRenderer();
    const three = createMockRenderer();
    const multi = new MultiSceneRenderer([
      { renderer: pixi, accepts: nodeBelongsToPixiBackground },
      { renderer: three, accepts: nodeBelongsToThree },
    ]);

    const sprite = createNodeWithVisual("S", { x: 0, y: 0 }, createSpriteComponent());
    const model = createNodeWithTransform3D("M", { x: 0, y: 0, z: 0 });
    multi.createNode(sprite);
    multi.createNode(model);

    expect(pixi.created).toEqual([sprite.id]);
    expect(three.created).toEqual([model.id]);
    void createEmptyScene;
  });

  it("destroys from previous slot when layer acceptance flips", () => {
    const pixi = createMockRenderer();
    const three = createMockRenderer();
    const multi = new MultiSceneRenderer([
      { renderer: pixi, accepts: nodeBelongsToPixiBackground },
      { renderer: three, accepts: nodeBelongsToThree },
    ]);
    const model = createNodeWithTransform3D("M", { x: 0, y: 0, z: 0 });
    multi.createNode(model);
    expect(three.nodes.has(model.id)).toBe(true);

    // Simulate acceptance flip by updating with a 2D sprite-shaped node id reuse:
    const sprite = createNodeWithVisual("S", { x: 0, y: 0 }, createSpriteComponent());
    sprite.id = model.id;
    multi.updateNode(sprite);
    expect(three.destroyNode).toHaveBeenCalledWith(model.id);
    expect(pixi.nodes.has(model.id)).toBe(true);
  });

  it("skips syncTransform when hasNode is false", () => {
    const pixi = createMockRenderer();
    const multi = new MultiSceneRenderer([
      { renderer: pixi, accepts: nodeBelongsToPixiBackground },
    ]);
    const sprite = createNodeWithVisual("S", { x: 0, y: 0 }, createSpriteComponent());
    multi.syncTransform(sprite);
    expect(pixi.syncTransform).not.toHaveBeenCalled();
  });

  it("returns the owning slot's live 2D transform handle", () => {
    const live = { x: 1, y: 2, rotation: 0, scaleX: 1, scaleY: 1 };
    const pixi = createMockRenderer();
    pixi.getRuntimeTransform2D = vi.fn((id: string) =>
      id === "node_a" ? live : undefined,
    );
    const three = createMockRenderer();
    const multi = new MultiSceneRenderer([
      { renderer: pixi },
      { renderer: three },
    ]);
    expect(multi.getRuntimeTransform2D("node_a")).toBe(live);
    expect(multi.getRuntimeTransform2D("missing")).toBeUndefined();
  });

  it("forwards setPlaybackPaused to every slot", () => {
    const pixi = createMockRenderer();
    pixi.setPlaybackPaused = vi.fn();
    const three = createMockRenderer();
    three.setPlaybackPaused = vi.fn();
    const multi = new MultiSceneRenderer([
      { renderer: pixi },
      { renderer: three },
    ]);
    multi.setPlaybackPaused(true);
    expect(pixi.setPlaybackPaused).toHaveBeenCalledWith(true);
    expect(three.setPlaybackPaused).toHaveBeenCalledWith(true);
  });
});
