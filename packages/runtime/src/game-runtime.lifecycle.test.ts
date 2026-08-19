import { describe, expect, it, vi } from "vitest";
import { ComponentRegistry, defineComponent } from "@game-editor/game-components";
import {
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import { GameRuntime } from "./game-runtime.js";

function createMockRenderer(): SceneRenderer {
  return {
    createNode: vi.fn(),
    updateNode: vi.fn(),
    syncTransform: vi.fn(),
    destroyNode: vi.fn(),
    reparentNode: vi.fn(),
    clear: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
  };
}

function sceneWithScript(name: string, scriptId: string): {
  scene: ReturnType<typeof createEmptyScene>;
  node: SceneNodeData;
} {
  const node = createSpriteNode(name, { x: 0, y: 0 });
  node.components.push(createScriptComponent(scriptId));
  const scene = createEmptyScene(name);
  scene.nodes = [node];
  return { scene, node };
}

describe("GameRuntime lifecycle", () => {
  it("replacing a scene destroys previous scripts and tick after dispose is a no-op", () => {
    const first = { update: 0, destroy: 0 };
    const second = { update: 0, destroy: 0 };
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.First",
        displayName: "First",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => ({
          update() {
            first.update += 1;
          },
          destroy() {
            first.destroy += 1;
          },
        }),
      }),
    );
    registry.register(
      defineComponent({
        id: "test.Second",
        displayName: "Second",
        category: "Test",
        categoryOrder: 0,
        order: 1,
        properties: {},
        create: () => ({
          update() {
            second.update += 1;
          },
          destroy() {
            second.destroy += 1;
          },
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    runtime.loadScene(sceneWithScript("A", "test.First").scene);
    runtime.tick(1 / 60);
    expect(first.update).toBe(1);

    runtime.loadScene(sceneWithScript("B", "test.Second").scene);
    expect(first.destroy).toBe(1);
    runtime.tick(1 / 60);
    expect(first.update).toBe(1);
    expect(second.update).toBe(1);

    runtime.dispose();
    runtime.dispose();
    runtime.tick(1 / 60);
    expect(second.destroy).toBe(1);
    expect(second.update).toBe(1);
  });

  it("clears scene lookups and renderer nodes on dispose, then accepts a new register", () => {
    const attached = { create: 0, destroy: 0 };
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.LifecycleHost",
        displayName: "LifecycleHost",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => {
          attached.create += 1;
          return {
            destroy() {
              attached.destroy += 1;
            },
          };
        },
      }),
    );

    const renderer = createMockRenderer();
    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const { scene, node } = sceneWithScript("Host", "test.LifecycleHost");
    runtime.loadScene(scene);
    expect(runtime.getScriptInstanceCount()).toBe(1);
    expect(attached.create).toBe(1);

    runtime.tick(1 / 60);
    const spawnedId = runtime.spawnModel3DNode({
      assetId: "asset_stone",
      name: "Stone",
      position: { x: 1, y: 2, z: 3 },
    });
    expect(spawnedId).toBeDefined();
    expect(runtime.sceneIndex.getNode(spawnedId!)).toBeDefined();

    runtime.destroySpawnedNode(spawnedId!);
    expect(runtime.sceneIndex.getNode(spawnedId!)).toBeUndefined();

    runtime.dispose();
    expect(attached.destroy).toBe(1);
    expect(runtime.getScriptInstanceCount()).toBe(0);
    expect(runtime.getScene()).toBeUndefined();
    expect(runtime.sceneIndex.getNode(node.id)).toBeUndefined();
    expect(renderer.clear).toHaveBeenCalled();

    const nextRenderer = createMockRenderer();
    runtime.registerRenderer({
      kind: "pixi",
      renderer: nextRenderer,
      layer: { id: "replay", renderer: "pixi", order: 1 },
    });
    runtime.loadScene(scene);
    expect(runtime.getScriptInstanceCount()).toBe(1);
    expect(attached.create).toBe(2);
    expect(nextRenderer.createNode).toHaveBeenCalled();
  });
});
