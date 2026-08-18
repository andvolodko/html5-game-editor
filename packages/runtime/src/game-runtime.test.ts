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
  createModel3DComponent,
  createNodeWithTransform3D,
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

  it("clearRenderers drops registrations so a later loadScene does not paint the old stack", () => {
    const renderer = createMockRenderer();
    const runtime = new GameRuntime();
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    runtime.clearRenderers();
    runtime.loadScene(createEmptyScene("Empty"));
    expect(renderer.clear).not.toHaveBeenCalled();
    expect(runtime.getRegisteredRenderers()).toEqual([]);
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

  it("does not instantiate disabled Script components", () => {
    const created = vi.fn(() => ({ update: vi.fn() }));
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
    node.components.push(
      createScriptComponent("test.Marker", { n: 1 }, { enabled: false }),
    );
    const scene = createEmptyScene("Scripts");
    scene.nodes = [node];

    runtime.loadScene(scene);

    expect(created).not.toHaveBeenCalled();
    expect(runtime.getScriptInstanceCount()).toBe(0);
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

  it("bubbles pointer events from a child visual to a parent script", () => {
    const onTap = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.ParentClick",
        displayName: "Parent Click",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          const off = ctx.services.onNodePointerEvent?.(
            ctx.nodeId,
            "pointertap",
            onTap,
          );
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

    const parent = createContainerNode("Button");
    parent.components.push(createScriptComponent("test.ParentClick"));
    const child = createSpriteNode("regular", { x: 0, y: 0 });
    child.parentId = parent.id;
    parent.children = [child];
    const scene = createEmptyScene("Bubble");
    scene.nodes = [parent];
    runtime.loadScene(scene);

    runtime.emitNodePointerEvent(child.id, "pointertap");
    expect(onTap).toHaveBeenCalledTimes(1);
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

  it("exposes getTransform3D / setTransform3D and Model3D playback", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    let seenZ = 0;
    let seenClip = "";
    registry.register(
      defineComponent({
        id: "test.Walker3D",
        displayName: "Walker3D",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            const t = ctx.services.getTransform3D?.(ctx.nodeId);
            if (!t || !ctx.services.setTransform3D) {
              return;
            }
            seenZ = t.position.z + 2;
            ctx.services.setTransform3D(ctx.nodeId, {
              position: { x: t.position.x, y: t.position.y, z: seenZ },
            });
            ctx.services.setModel3DPlayback?.(ctx.nodeId, {
              animation: "walk",
              loop: true,
            });
            seenClip =
              ctx.services.getModel3DPlayback?.(ctx.nodeId)?.animation ?? "";
          },
        }),
      }),
    );

    const runtime = new GameRuntime({
      components: registry,
      services: {
        bus: new EventBus(),
        changeScene: () => undefined,
        listModel3DAnimations: () => ["idle", "walk"],
        getModel3DAnimationDuration: () => 1.5,
      },
    });
    runtime.registerRenderer({
      kind: "three",
      renderer,
      layer: { id: "main", renderer: "three", order: 0 },
    });

    const node = createNodeWithTransform3D(
      "Monster",
      { x: 1, y: 2, z: 3 },
      createModel3DComponent({
        assetId: "asset_m",
        animation: "idle",
        timeScale: 0.6,
      }),
    );
    node.components.push(createScriptComponent("test.Walker3D"));
    const scene = createEmptyScene("Move3D", { renderer: "three" });
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(seenZ).toBe(5);
    expect(seenClip).toBe("walk");
    expect(renderer.syncTransform).toHaveBeenCalled();
    expect(renderer.updateNode).toHaveBeenCalled();
    expect(runtime.getScene()?.nodes[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Transform3D",
          position: { x: 1, y: 2, z: 5 },
        }),
        expect.objectContaining({
          type: "Model3D",
          animation: "walk",
          loop: true,
          timeScale: 0.6,
        }),
      ]),
    );
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

  it("exposes setSpriteAssetId and syncs Sprite nodes via updateNode", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.SpritePainter",
        displayName: "Sprite Painter",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            ctx.services.setSpriteAssetId?.(ctx.nodeId, "asset_face");
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

    const node = createSpriteNode("Card", { x: 0, y: 0 }, { assetId: "asset_back" });
    node.components.push(createScriptComponent("test.SpritePainter"));
    const scene = createEmptyScene("Sprite");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(renderer.updateNode).toHaveBeenCalled();
    expect(runtime.getScene()?.nodes[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Sprite", assetId: "asset_face" }),
      ]),
    );
  });

  it("exposes reparentNode and syncs renderers", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Reparenter",
        displayName: "Reparenter",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            ctx.services.reparentNode?.("node_card", ctx.nodeId);
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

    const pile = createContainerNode("Pile");
    pile.components.push(createScriptComponent("test.Reparenter"));
    const card = createContainerNode("Card");
    card.id = "node_card";
    const scene = createEmptyScene("Reparent");
    scene.nodes = [pile, card];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(renderer.reparentNode).toHaveBeenCalledWith("node_card", pile.id, 0);
    expect(runtime.getScene()?.nodes).toHaveLength(1);
    expect(runtime.getScene()?.nodes[0]?.children[0]?.id).toBe("node_card");
  });

  it("setTransform2D skips hybrid layers that do not own the node", () => {
    const background = createMockRenderer();
    const foreground = createMockRenderer();
    const registry = new ComponentRegistry();
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
            ctx.services.setTransform2D(ctx.nodeId, {
              position: { x: t.position.x + 1, y: t.position.y },
            });
          },
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: background,
      layer: { id: "pixi-bg", renderer: "pixi", order: 0 },
      accepts: (node) => node.layer !== "foreground",
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: foreground,
      layer: { id: "pixi-fg", renderer: "pixi", order: 200 },
      accepts: (node) => node.layer === "foreground",
    });

    const node = createSpriteNode("Raptor", { x: 0, y: 0 });
    node.layer = "foreground";
    node.components.push(createScriptComponent("test.Mover"));
    const scene = createEmptyScene("Hybrid");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(foreground.syncTransform).toHaveBeenCalledTimes(1);
    expect(background.syncTransform).not.toHaveBeenCalled();
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

  it("keeps Pixi and Three render stats as separate slices", () => {
    const pixi = createMockRenderer();
    pixi.getRenderStats = vi.fn(() => ({
      drawCalls: 4,
      triangles: 5000,
      canvas: 1,
      displayObjects: 128,
    }));
    const three = createMockRenderer();
    three.getRenderStats = vi.fn(() => ({
      drawCalls: 8,
      triangles: 15000,
      canvas: 1,
      displayObjects: 42,
    }));
    const runtime = new GameRuntime();
    runtime.registerRenderer({
      kind: "pixi",
      renderer: pixi,
      layer: { id: "pixi", renderer: "pixi", order: 0 },
    });
    runtime.registerRenderer({
      kind: "three",
      renderer: three,
      layer: { id: "three", renderer: "three", order: 100 },
    });
    runtime.tick(1 / 60);
    runtime.render();
    const stats = runtime.getPerformanceStats();
    expect(stats.drawCalls).toBe(12);
    expect(stats.triangles).toBe(20000);
    expect(stats.canvas).toBe(2);
    expect(stats.displayObjects).toBe(170);
    expect(stats.pixi).toEqual({
      drawCalls: 4,
      triangles: 5000,
      canvas: 1,
      displayObjects: 128,
    });
    expect(stats.three).toEqual({
      drawCalls: 8,
      triangles: 15000,
      canvas: 1,
      displayObjects: 42,
    });
  });

  it("spawnModel3D inserts a live Model3D and destroyNode removes it", () => {
    const renderer = createMockRenderer();
    const spawnedIds: string[] = [];
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Spawner",
        displayName: "Spawner",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            if (spawnedIds.length > 0) {
              return;
            }
            const id = ctx.services.spawnModel3D?.({
              assetId: "asset_stone",
              name: "Stone",
              position: { x: 4, y: 5, z: 6 },
            });
            if (id) {
              spawnedIds.push(id);
            }
          },
          destroy() {
            const id = spawnedIds[0];
            if (id) {
              ctx.services.destroyNode?.(id);
            }
          },
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "three",
      renderer,
      layer: { id: "main", renderer: "three", order: 0 },
    });
    const host = createNodeWithTransform3D("Host", { x: 0, y: 0, z: 0 });
    host.components.push(createScriptComponent("test.Spawner"));
    const scene = createEmptyScene("Spawn", { renderer: "three" });
    scene.nodes = [host];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(spawnedIds).toHaveLength(1);
    expect(runtime.getScene()?.nodes).toHaveLength(2);
    expect(renderer.created.map((node) => node.name)).toEqual(["Host", "Stone"]);

    runtime.dispose();
    expect(renderer.destroyNode).toHaveBeenCalledWith(spawnedIds[0]);
    expect(runtime.getScene()?.nodes).toHaveLength(1);
  });

  it("cloneNodeByName copies a 2D node into the live scene", () => {
    const renderer = createMockRenderer();
    const clonedIds: string[] = [];
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Cloner",
        displayName: "Cloner",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            if (clonedIds.length > 0) {
              return;
            }
            const id = ctx.services.cloneNodeByName?.("Hero", 0);
            if (id) {
              clonedIds.push(id);
            }
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
    const source = createSpriteNode("Hero", { x: 10, y: 20 });
    const host = createSpriteNode("Host", { x: 0, y: 0 });
    host.components.push(createScriptComponent("test.Cloner"));
    const scene = createEmptyScene("Clone");
    scene.nodes = [source, host];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(clonedIds).toHaveLength(1);
    expect(runtime.getScene()?.nodes.map((node) => node.name)).toEqual([
      "Hero",
      "Host",
      "Hero Copy",
    ]);
    expect(renderer.created.map((node) => node.name)).toEqual([
      "Hero",
      "Host",
      "Hero Copy",
    ]);
  });

  it("destroyNode ignores authored scene nodes", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Killer",
        displayName: "Killer",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            ctx.services.destroyNode?.(ctx.nodeId);
          },
        }),
      }),
    );
    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "three",
      renderer,
      layer: { id: "main", renderer: "three", order: 0 },
    });
    const host = createNodeWithTransform3D("Host", { x: 0, y: 0, z: 0 });
    host.components.push(createScriptComponent("test.Killer"));
    const scene = createEmptyScene("Authored", { renderer: "three" });
    scene.nodes = [host];
    runtime.loadScene(scene);
    runtime.tick(1 / 60);
    expect(runtime.getScene()?.nodes).toHaveLength(1);
    expect(renderer.destroyNode).not.toHaveBeenCalled();
  });

  it("exposes getModel3DBoneWorldTransform from the Three renderer", () => {
    const renderer = createMockRenderer();
    renderer.getBoneWorldTransform = vi.fn(() => ({
      position: { x: 3, y: 4, z: 5 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
    }));
    let seenY = 0;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.BoneReader",
        displayName: "Bone Reader",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            seenY =
              ctx.services.getModel3DBoneWorldTransform?.(
                ctx.nodeId,
                "bone_12_Bone02",
              )?.position.y ?? 0;
          },
        }),
      }),
    );
    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "three",
      renderer,
      layer: { id: "main", renderer: "three", order: 0 },
    });
    const host = createNodeWithTransform3D("Catapult", { x: 0, y: 0, z: 0 });
    host.components.push(createScriptComponent("test.BoneReader"));
    const scene = createEmptyScene("Bones", { renderer: "three" });
    scene.nodes = [host];
    runtime.loadScene(scene);
    runtime.tick(1 / 60);
    expect(seenY).toBe(4);
    expect(renderer.getBoneWorldTransform).toHaveBeenCalledWith(
      host.id,
      "bone_12_Bone02",
    );
  });
});
