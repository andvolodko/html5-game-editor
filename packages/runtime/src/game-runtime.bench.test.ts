import { describe, expect, it, vi } from "vitest";
import { ComponentRegistry, defineComponent } from "@game-editor/game-components";
import {
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
  type SceneRenderer,
} from "@game-editor/scene";
import { GameRuntime } from "./game-runtime.js";

const SCRIPT_COUNT = 1_000;
const TICK_COUNT = 60;

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

describe("GameRuntime benchmarks", () => {
  it("records script update duration for a large scene", () => {
    let updates = 0;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Ticker",
        displayName: "Ticker",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update(dt) {
            ctx.transform.x += dt;
            updates += 1;
          },
        }),
      }),
    );

    const scene = createEmptyScene("Bench");
    const nodes = [];
    for (let index = 0; index < SCRIPT_COUNT; index += 1) {
      const node = createSpriteNode(`N${String(index)}`, { x: 0, y: 0 });
      node.components.push(createScriptComponent("test.Ticker"));
      nodes.push(node);
    }
    scene.nodes = nodes;

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const loadStarted = performance.now();
    runtime.loadScene(scene);
    const loadMs = performance.now() - loadStarted;

    const tickStarted = performance.now();
    for (let step = 0; step < TICK_COUNT; step += 1) {
      runtime.tick(1 / 60);
    }
    const tickMs = performance.now() - tickStarted;

    runtime.dispose();
    expect(updates).toBe(SCRIPT_COUNT * TICK_COUNT);
    expect(loadMs).toBeGreaterThanOrEqual(0);
    expect(tickMs).toBeGreaterThanOrEqual(0);
  });
});
