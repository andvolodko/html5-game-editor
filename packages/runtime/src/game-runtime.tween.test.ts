import { describe, expect, it } from "vitest";
import {
  ComponentRegistry,
  defineComponent,
} from "@game-editor/game-components";
import {
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
  getTransform2D,
} from "@game-editor/scene";
import { GameRuntime } from "./game-runtime.js";

const NODE_ID = "node_tween_target";

function positionX(runtime: GameRuntime): number {
  const node = runtime.getScene()?.nodes[0];
  const transform = node ? getTransform2D(node) : undefined;
  if (!transform) {
    throw new Error("Expected a Transform2D on the first node");
  }
  return transform.position.x;
}

describe("GameRuntime tweens", () => {
  it("holds while paused and drops tweens when the scene reloads", () => {
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Slide",
        displayName: "Slide",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          start() {
            ctx.tween.to({ x: 100, duration: 1, ease: "linear" });
          },
        }),
      }),
    );
    const runtime = new GameRuntime({ components: registry });
    const node = createSpriteNode("Mover", { x: 0, y: 0 });
    node.id = NODE_ID;
    node.components.push(createScriptComponent("test.Slide"));
    const scene = createEmptyScene("Tweens");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(0.25);
    expect(positionX(runtime)).toBeCloseTo(25);

    runtime.setPaused(true);
    runtime.tick(0.5);
    expect(positionX(runtime)).toBeCloseTo(25);
    runtime.setPaused(false);

    const next = createSpriteNode("Mover", { x: 0, y: 0 });
    next.id = NODE_ID;
    const reloaded = createEmptyScene("After");
    reloaded.nodes = [next];
    runtime.loadScene(reloaded);
    runtime.tick(0.5);
    expect(positionX(runtime)).toBeCloseTo(0);
  });
});
