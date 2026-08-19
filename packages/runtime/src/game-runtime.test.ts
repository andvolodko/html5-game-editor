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
  createDetachedRuntimeTransform2D,
  createEmptyScene,
  createModel3DComponent,
  createNodeWithTransform3D,
  createNodeWithVisual,
  createScriptComponent,
  createSpriteNode,
  createTextComponent,
  getTransform2D,
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

  it("exposes a stable ctx.transform that updates the live node without setTransform2D", () => {
    const node = createSpriteNode("Hero", { x: 100, y: 50 });
    const live = createDetachedRuntimeTransform2D({
      x: 100,
      y: 50,
      scaleX: 1,
      scaleY: 1,
    });
    const renderer = createMockRenderer();
    renderer.getRuntimeTransform2D = vi.fn((nodeId: string) =>
      nodeId === node.id ? live : undefined,
    );

    let captured:
      | {
          transform: typeof live;
          startX: number;
          startY: number;
        }
      | undefined;
    const setTransform2D = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.DirectMover",
        displayName: "DirectMover",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          captured = {
            transform: ctx.transform,
            startX: ctx.transform.x,
            startY: ctx.transform.y,
          };
          return {
            update() {
              ctx.transform.x = captured!.startX + 10;
              ctx.transform.y = captured!.startY + 5;
              ctx.transform.rotation = 90;
              ctx.transform.scaleX = -2;
              ctx.transform.scaleY = 3;
            },
          };
        },
      }),
    );

    const runtime = new GameRuntime({
      components: registry,
      services: {
        bus: new EventBus(),
        changeScene: () => undefined,
        setTransform2D,
      },
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    node.components.push(createScriptComponent("test.DirectMover"));
    const scene = createEmptyScene("DirectMove");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(captured).toBeDefined();
    expect(captured!.startX).toBe(100);
    expect(captured!.startY).toBe(50);
    expect(captured!.transform).toBe(live);
    expect(captured!.transform).toBe(captured!.transform);

    runtime.tick(1 / 60);

    expect(live.x).toBe(110);
    expect(live.y).toBe(55);
    expect(live.rotation).toBe(90);
    expect(live.scaleX).toBe(-2);
    expect(live.scaleY).toBe(3);
    expect(setTransform2D).not.toHaveBeenCalled();
    expect(renderer.syncTransform).not.toHaveBeenCalled();
    expect(getTransform2D(runtime.getScene()!.nodes[0]!)).toMatchObject({
      position: { x: 100, y: 50 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    });
  });

  it("reads initial pose from ctx.transform when no renderer handle exists", () => {
    const renderer = createMockRenderer();
    let startX = -1;
    let startY = -1;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.InitPose",
        displayName: "InitPose",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          startX = ctx.transform.x;
          startY = ctx.transform.y;
          return {};
        },
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });

    const node = createSpriteNode("Cloud", { x: 28, y: 14 });
    node.components.push(createScriptComponent("test.InitPose"));
    const scene = createEmptyScene("Init");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(startX).toBe(28);
    expect(startY).toBe(14);
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

  it("exposes ctx.transform3D and ctx.animations bound to the host node", () => {
    const renderer = createMockRenderer();
    const registry = new ComponentRegistry();
    let seenZ = 0;
    let listed: readonly string[] = [];
    registry.register(
      defineComponent({
        id: "test.HighLevelWalker3D",
        displayName: "HighLevelWalker3D",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          update() {
            listed = ctx.animations.list();
            const { position } = ctx.transform3D;
            seenZ = position.z + 2;
            ctx.transform3D.setPosition({
              x: position.x,
              y: position.y,
              z: seenZ,
            });
            ctx.animations.play("walk", { loop: true });
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
    node.components.push(createScriptComponent("test.HighLevelWalker3D"));
    const scene = createEmptyScene("Move3DHighLevel", { renderer: "three" });
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.tick(1 / 60);
    expect(seenZ).toBe(5);
    expect(listed).toEqual(["idle", "walk"]);
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

  it("invokes start once, update each tick, and destroy exactly once", () => {
    const hooks = { create: 0, start: 0, update: 0, destroy: 0 };
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Lifecycle",
        displayName: "Lifecycle",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => {
          hooks.create += 1;
          return {
            start() {
              hooks.start += 1;
            },
            update() {
              hooks.update += 1;
            },
            destroy() {
              hooks.destroy += 1;
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
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Lifecycle"));
    const scene = createEmptyScene("Lifecycle");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(hooks).toEqual({ create: 1, start: 1, update: 0, destroy: 0 });
    runtime.tick(1 / 60);
    runtime.tick(1 / 60);
    expect(hooks.update).toBe(2);
    runtime.dispose();
    runtime.dispose();
    expect(hooks.destroy).toBe(1);
  });

  it("lets start() read the node's initial ctx.transform pose", () => {
    let startX = -1;
    let startY = -1;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.StartPose",
        displayName: "StartPose",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => ({
          start() {
            startX = ctx.transform.x;
            startY = ctx.transform.y;
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
    const node = createSpriteNode("Cloud", { x: 28, y: 14 });
    node.components.push(createScriptComponent("test.StartPose"));
    const scene = createEmptyScene("StartPose");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(startX).toBe(28);
    expect(startY).toBe(14);
  });

  it("notifies the existing instance on property edits without recreating it", () => {
    let created = 0;
    let seenSpeed = 0;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.LiveProps",
        displayName: "LiveProps",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {
          speed: { kind: "number", default: 1 },
        },
        create: (ctx) => {
          created += 1;
          seenSpeed =
            typeof ctx.properties.speed === "number" ? ctx.properties.speed : 0;
          return {
            onPropertiesChanged(properties) {
              seenSpeed =
                typeof properties.speed === "number" ? properties.speed : 0;
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
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    const script = createScriptComponent(
      "test.LiveProps",
      { speed: 1 },
      { id: "comp_live" },
    );
    node.components.push(script);
    const scene = createEmptyScene("LiveProps");
    scene.nodes = [node];
    runtime.loadScene(scene);

    expect(created).toBe(1);
    expect(seenSpeed).toBe(1);

    runtime.notifyScriptProperties(node.id, "comp_live", { speed: 2.5 });
    expect(created).toBe(1);
    expect(seenSpeed).toBe(2.5);
    expect(
      runtime
        .getScene()
        ?.nodes[0]?.components.find((component) => component.id === "comp_live"),
    ).toMatchObject({ properties: { speed: 2.5 } });

    runtime.notifyScriptProperties(node.id, "comp_live", { speed: 2.5 });
    expect(created).toBe(1);
    expect(seenSpeed).toBe(2.5);
  });

  it("isolates lifecycle errors so other components still run", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secondStart = vi.fn();
    const secondUpdate = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Broken",
        displayName: "Broken",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => ({
          start() {
            throw new Error("start failed");
          },
          update() {
            throw new Error("update failed");
          },
        }),
      }),
    );
    registry.register(
      defineComponent({
        id: "test.Healthy",
        displayName: "Healthy",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => ({
          start: secondStart,
          update: secondUpdate,
        }),
      }),
    );

    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: createMockRenderer(),
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    const broken = createSpriteNode("Broken", { x: 0, y: 0 });
    broken.components.push(createScriptComponent("test.Broken"));
    const healthy = createSpriteNode("Healthy", { x: 1, y: 1 });
    healthy.components.push(createScriptComponent("test.Healthy"));
    const scene = createEmptyScene("Isolation");
    scene.nodes = [broken, healthy];
    runtime.loadScene(scene);

    expect(secondStart).toHaveBeenCalledTimes(1);
    runtime.tick(1 / 60);
    expect(secondUpdate).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("GameRuntime.setPaused", () => {
  it("skips update and pointer events while paused", () => {
    const update = vi.fn();
    const onTap = vi.fn();
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.Pausable",
        displayName: "Pausable",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: (ctx) => {
          ctx.services.onNodePointerEvent?.(ctx.nodeId, "pointertap", onTap);
          return { update };
        },
      }),
    );

    const renderer = createMockRenderer();
    renderer.setPlaybackPaused = vi.fn();
    const runtime = new GameRuntime({ components: registry });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(createScriptComponent("test.Pausable"));
    const scene = createEmptyScene("Pause");
    scene.nodes = [node];
    runtime.loadScene(scene);

    runtime.setPaused(true);
    expect(runtime.isPaused()).toBe(true);
    expect(renderer.setPlaybackPaused).toHaveBeenCalledWith(true);

    runtime.tick(1 / 60);
    runtime.emitNodePointerEvent(node.id, "pointertap");
    runtime.emitNodeClick(node.id);
    expect(update).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();

    runtime.setPaused(false);
    runtime.tick(1 / 60);
    runtime.emitNodePointerEvent(node.id, "pointertap");
    expect(update).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("applies pause to renderers registered after setPaused", () => {
    const runtime = new GameRuntime();
    runtime.setPaused(true);
    const renderer = createMockRenderer();
    renderer.setPlaybackPaused = vi.fn();
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    expect(renderer.setPlaybackPaused).toHaveBeenCalledWith(true);
  });

  it("still delivers Inspector property edits while paused", () => {
    let seenSpeed = 0;
    const registry = new ComponentRegistry();
    registry.register(
      defineComponent({
        id: "test.PausedProps",
        displayName: "Paused Props",
        category: "Test",
        categoryOrder: 0,
        order: 0,
        properties: {},
        create: () => ({
          onPropertiesChanged(properties) {
            seenSpeed =
              typeof properties.speed === "number" ? properties.speed : 0;
          },
        }),
      }),
    );
    const runtime = new GameRuntime({ components: registry });
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    const script = createScriptComponent(
      "test.PausedProps",
      { speed: 1 },
      { id: "comp_paused" },
    );
    node.components.push(script);
    const scene = createEmptyScene("PausedProps");
    scene.nodes = [node];
    runtime.loadScene(scene);
    runtime.setPaused(true);
    runtime.notifyScriptProperties(node.id, "comp_paused", { speed: 4 });
    expect(seenSpeed).toBe(4);
  });
});
