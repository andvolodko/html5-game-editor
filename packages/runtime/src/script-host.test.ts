import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  ComponentRegistry,
  defineComponent,
} from "@game-editor/game-components";
import {
  createDetachedRuntimeTransform2D,
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";

describe("ScriptHost", () => {
  it("uses the host ScriptSceneLookup instead of walking the scene tree", () => {
    const node = createSpriteNode("Host", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Lookup"));
    const scene = createEmptyScene("Lookup");
    scene.nodes = [node];

    const getNode = vi.fn((nodeId: string) =>
      nodeId === node.id ? node : undefined,
    );
    const getParentId = vi.fn(() => undefined);
    const findByName = vi.fn(() => undefined);

    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Lookup",
        displayName: "Lookup",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          start() {
            expect(ctx.node.name).toBe("Host");
          },
        }),
      }),
    );

    const host = new ScriptHost(
      registry,
      {
        bus: new EventBus(),
        changeScene: () => undefined,
      },
      () => createDetachedRuntimeTransform2D(),
      () => ({ getNode, getParentId, findByName }),
    );
    host.attachScene(scene);

    expect(getNode).toHaveBeenCalledWith(node.id);
    expect(host.getInstanceCount()).toBe(1);
  });
});
