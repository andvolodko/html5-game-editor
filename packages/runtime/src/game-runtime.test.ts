import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  ComponentRegistry,
  defineComponent,
  installSceneFlowRuntime,
  registerSharedComponents,
} from "@game-editor/game-components";
import {
  createContainerNode,
  createEmptyScene,
  createNodeWithVisual,
  createScriptComponent,
  createSpriteNode,
  createTextComponent,
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
    syncTransform: vi.fn(),
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
    expect(renderer.created.map((node) => node.name)).toEqual([
      "Parent",
      "Child",
    ]);
    expect(renderer.created[0]?.id).toBe(parent.id);
    expect(renderer.created[1]?.parentId).toBe(parent.id);
  });

  it("instantiates registered Script components via ScriptHost", () => {
    const created = vi.fn((ctx) => {
      expect(ctx.services.bus).toBeDefined();
      return { update: vi.fn() };
    });
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Marker",
        displayName: "Marker",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: created,
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Marker", { n: 1 }));
    const scene = createEmptyScene("Scripts");
    scene.nodes = [node];

    runtime.loadScene(scene);

    expect(created).toHaveBeenCalledTimes(1);
    expect(runtime.getScriptInstanceCount()).toBe(1);
  });

  it("skips unknown scriptIds without failing load", () => {
    const runtime = new GameRuntime({ components: new ComponentRegistry() });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(createScriptComponent("missing.Thing"));
    const scene = createEmptyScene("Scripts");
    scene.nodes = [node];

    runtime.loadScene(scene);
    expect(runtime.getScriptInstanceCount()).toBe(0);
  });

  it("Change Scene script navigates on EventBus emit", () => {
    const registry = new ComponentRegistry();
    registerSharedComponents(registry);
    installSceneFlowRuntime(registry);

    const bus = new EventBus();
    const changeScene = vi.fn();
    const runtime = new GameRuntime({
      components: registry,
      services: { bus, changeScene },
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Portal", { x: 0, y: 0 });
    node.components.push(
      createScriptComponent("shared.ChangeScene", {
        event: "game.start",
        sceneName: "test",
      }),
    );
    const scene = createEmptyScene("Scripts");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(runtime.getScriptInstanceCount()).toBe(1);
    bus.emit("game.start");
    expect(changeScene).toHaveBeenCalledWith("test");
  });

  it("forwards emitNodeClick to onNodeClick script subscribers", () => {
    const onClick = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Clickable",
        displayName: "Clickable",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          const off = ctx.services.onNodeClick?.(ctx.nodeId, onClick);
          return {
            destroy() {
              off?.();
            },
          };
        },
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Btn", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Clickable"));
    const scene = createEmptyScene("Clicks");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.emitNodeClick(node.id);
    expect(onClick).toHaveBeenCalledTimes(1);

    runtime.emitNodeClick("unknown_node");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards emitNodePointerEvent to onNodePointerEvent subscribers", () => {
    const onDown = vi.fn();
    const onTap = vi.fn();
    const onLegacyClick = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Pointer",
        displayName: "Pointer",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          const offs = [
            ctx.services.onNodePointerEvent?.(ctx.nodeId, "pointerdown", onDown),
            ctx.services.onNodePointerEvent?.(ctx.nodeId, "pointertap", onTap),
            ctx.services.onNodeClick?.(ctx.nodeId, onLegacyClick),
          ];
          return {
            destroy() {
              for (const off of offs) {
                off?.();
              }
            },
          };
        },
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Btn", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Pointer"));
    const scene = createEmptyScene("Pointers");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.emitNodePointerEvent(node.id, "pointerdown");
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    expect(onLegacyClick).not.toHaveBeenCalled();

    runtime.emitNodePointerEvent(node.id, "pointertap");
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onLegacyClick).toHaveBeenCalledTimes(1);
  });

  it("exposes getTransform2D / setTransform2D and syncs renderers", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    let seenX = 0;
    registry.register(
      defineComponent({
        id: "test.Mover",
        displayName: "Mover",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            const t = ctx.services.getTransform2D?.(ctx.nodeId);
            if (!t || !ctx.services.setTransform2D) {
              return;
            }
            seenX = t.position.x + 10;
            ctx.services.setTransform2D(ctx.nodeId, {
              position: { x: seenX, y: t.position.y },
              scale: { x: -Math.abs(t.scale.x), y: t.scale.y },
            });
          },
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Hero", { x: 100, y: 50 });
    node.components.push(createScriptComponent("test.Mover"));
    const scene = createEmptyScene("Move");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(seenX).toBe(110);
    expect(renderer.syncTransform).toHaveBeenCalled();
    expect(renderer.updateNode).not.toHaveBeenCalled();
    const transform = runtime
      .getScene()
      ?.nodes[0]?.components.find((c) => c.type === "Transform2D");
    expect(transform).toMatchObject({
      type: "Transform2D",
      position: { x: 110, y: 50 },
      scale: { x: -1, y: 1 },
    });
  });

  it("exposes setText and syncs Text nodes via updateNode", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.LabelWriter",
        displayName: "Label Writer",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            ctx.services.setText?.(ctx.nodeId, "hello");
          },
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createNodeWithVisual(
      "Label",
      { x: 0, y: 0 },
      createTextComponent({ text: "before" }),
    );
    node.components.push(createScriptComponent("test.LabelWriter"));
    const scene = createEmptyScene("Text");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(renderer.updateNode).toHaveBeenCalled();
    const text = runtime
      .getScene()
      ?.nodes[0]?.components.find((c) => c.type === "Text");
    expect(text).toMatchObject({ type: "Text", text: "hello" });
  });

  it("tracks frame timing for getPerformanceStats", () => {
    const runtime = new GameRuntime();
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    runtime.tick(1 / 60);
    runtime.render();
    const stats = runtime.getPerformanceStats();
    expect(stats.frameTimeMs).toBeCloseTo(1000 / 60, 5);
    expect(stats.fps).toBeCloseTo(60, 5);
    expect(stats.gameLogicMs).toBeGreaterThanOrEqual(0);
    expect(stats.rendererMs).toBeGreaterThanOrEqual(0);
  });
});
