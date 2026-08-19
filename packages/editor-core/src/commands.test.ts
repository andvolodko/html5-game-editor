import { describe, expect, it, vi } from "vitest";
import {
  createEmptyScene,
  getSpine,
  getSprite,
  getTransform2D,
  getTransform3D,
  getModel3D,
  getPerspectiveCamera,
  getDirectionalLight,
  getAmbientLight,
  findNodeById,
  parseSceneData,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateModel3DCommand,
  Editor,
  EditorViewportController,
  DocumentManager,
  KEYBOARD_NUDGE_PIXELS,
  KEYBOARD_NUDGE_SHIFT_PIXELS,
  SetTransform2DCommand,
  SetTransform3DCommand,
  SetModel3DCommand,
  SetSceneRendererCommand,
  SelectionManager,
} from "./index.js";

describe("editor sprite commands", () => {
  it("creates a sprite, undoes, and redoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const command = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Hero",
      { x: 10, y: 20 },
    );

    editor.execute(command);
    expect(editor.getScene().nodes).toHaveLength(1);
    expect(editor.selection.getSelectedNodeIds()).toEqual([command.createdNodeId]);
    expect(editor.getDirtyState()).toBe("dirty");

    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
    expect(editor.selection.getSelectedNodeIds()).toHaveLength(0);
    expect(editor.getDirtyState()).toBe("clean");

    editor.redo();
    expect(editor.getScene().nodes).toHaveLength(1);
    expect(editor.getDirtyState()).toBe("dirty");
  });

  it("creates a spine node, undoes, and redoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const command = new CreateSpineCommand(editor.document, editor.selection, {
      name: "Hero",
      position: { x: 8, y: 9 },
      assetId: "asset_spine",
    });
    editor.execute(command);
    const node = editor.getScene().nodes[0];
    expect(getSpine(node!)?.assetId).toBe("asset_spine");
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
    editor.redo();
    expect(getSpine(editor.getScene().nodes[0]!)?.assetId).toBe("asset_spine");
  });

  it("sets runtime visible through a command with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    expect(findNodeById(editor.getScene(), nodeId)?.visible).toBeUndefined();

    editor.setNodeVisible(nodeId, false);
    expect(findNodeById(editor.getScene(), nodeId)?.visible).toBe(false);
    expect(editor.getDirtyState()).toBe("dirty");

    editor.undo();
    expect(findNodeById(editor.getScene(), nodeId)?.visible).toBeUndefined();

    editor.redo();
    expect(findNodeById(editor.getScene(), nodeId)?.visible).toBe(false);
  });

  it("sets node alpha through a command with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    expect(findNodeById(editor.getScene(), nodeId)?.alpha).toBeUndefined();

    editor.setNodeAlpha(nodeId, 0.4);
    expect(findNodeById(editor.getScene(), nodeId)?.alpha).toBe(0.4);
    expect(editor.getDirtyState()).toBe("dirty");

    editor.undo();
    expect(findNodeById(editor.getScene(), nodeId)?.alpha).toBeUndefined();

    editor.redo();
    expect(findNodeById(editor.getScene(), nodeId)?.alpha).toBe(0.4);
  });

  it("sets node pointer fields through a command with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    expect(findNodeById(editor.getScene(), nodeId)?.pointerEventMode).toBeUndefined();
    expect(findNodeById(editor.getScene(), nodeId)?.cursor).toBeUndefined();

    editor.setNodePointer(nodeId, {
      eventMode: "none",
      cursor: "pointer",
      children: false,
    });
    const after = findNodeById(editor.getScene(), nodeId);
    expect(after?.pointerEventMode).toBe("none");
    expect(after?.cursor).toBe("pointer");
    expect(after?.pointerChildren).toBe(false);

    editor.undo();
    const undone = findNodeById(editor.getScene(), nodeId);
    expect(undone?.pointerEventMode).toBeUndefined();
    expect(undone?.cursor).toBeUndefined();
    expect(undone?.pointerChildren).toBeUndefined();

    editor.redo();
    const redone = findNodeById(editor.getScene(), nodeId);
    expect(redone?.pointerEventMode).toBe("none");
    expect(redone?.cursor).toBe("pointer");
    expect(redone?.pointerChildren).toBe(false);
  });

  it("does not change node alpha when the node is editor-locked", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    editor.setNodeAlpha(nodeId, 0.2);
    editor.setNodeLocked(nodeId, true);
    editor.setNodeAlpha(nodeId, 1);
    expect(findNodeById(editor.getScene(), nodeId)?.alpha).toBe(0.2);
  });

  it("does not change node pointer fields when the node is editor-locked", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    editor.setNodePointer(nodeId, { eventMode: "none" });
    editor.setNodeLocked(nodeId, true);
    editor.setNodePointer(nodeId, { eventMode: "static" });
    expect(findNodeById(editor.getScene(), nodeId)?.pointerEventMode).toBe("none");
  });

  it("does not change runtime visible when the node is editor-locked", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    editor.setNodeVisible(nodeId, false);
    editor.setNodeLocked(nodeId, true);
    editor.setNodeVisible(nodeId, true);
    expect(findNodeById(editor.getScene(), nodeId)?.visible).toBe(false);
  });

  it("edits Transform2D through a command with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);

    editor.execute(
      new SetTransform2DCommand(editor.document, create.createdNodeId, {
        position: { x: 100, y: 50 },
        rotation: 45,
        scale: { x: 2, y: 2 },
      }),
    );

    const node = editor.getScene().nodes[0];
    const transform = node ? getTransform2D(node) : undefined;
    expect(transform?.position).toEqual({ x: 100, y: 50 });
    expect(transform?.rotation).toBe(45);
    expect(transform?.scale).toEqual({ x: 2, y: 2 });

    editor.undo();
    const undone = editor.getScene().nodes[0]
      ? getTransform2D(editor.getScene().nodes[0]!)
      : undefined;
    expect(undone?.position).toEqual({ x: 0, y: 0 });
    expect(undone?.rotation).toBe(0);
  });

  it("flips via negative scale with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);

    editor.setTransform2D(create.createdNodeId, {
      scale: { x: -1, y: 1 },
    });
    expect(getTransform2D(editor.getScene().nodes[0]!)?.scale).toEqual({
      x: -1,
      y: 1,
    });

    editor.undo();
    expect(getTransform2D(editor.getScene().nodes[0]!)?.scale).toEqual({
      x: 1,
      y: 1,
    });
  });

  it("sets Transform2D skew with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);

    editor.setTransform2D(create.createdNodeId, {
      skew: { x: 37.2422, y: -17.1887 },
    });
    expect(getTransform2D(editor.getScene().nodes[0]!)?.skew).toEqual({
      x: 37.2422,
      y: -17.1887,
    });

    editor.undo();
    expect(getTransform2D(editor.getScene().nodes[0]!)?.skew).toBeUndefined();
  });

  it("sets visual anchor with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 0, y: 0 },
    );
    editor.execute(create);

    editor.setVisualComponent(create.createdNodeId, {
      anchor: { x: 0, y: 1 },
    });
    expect(getSprite(editor.getScene().nodes[0]!)?.anchor).toEqual({
      x: 0,
      y: 1,
    });

    editor.undo();
    expect(getSprite(editor.getScene().nodes[0]!)?.anchor).toBeUndefined();
  });

  it("round-trips serialized scene JSON without Pixi types", () => {
    const editor = new Editor({ scene: createEmptyScene("Persist") });
    editor.createSprite("A", { x: 5, y: 6 });

    const raw = JSON.parse(JSON.stringify(editor.getScene())) as unknown;
    const parsed = parseSceneData(raw);
    expect(parsed.nodes[0]?.components.map((c) => c.type).sort()).toEqual([
      "Sprite",
      "Transform2D",
    ]);
  });

  it("creates a sprite from assetId through the command path", () => {
    const editor = new Editor({ scene: createEmptyScene("Assets") });
    const command = new CreateSpriteCommand(editor.document, editor.selection, {
      name: "Wild",
      position: { x: 10, y: 20 },
      assetId: "asset_wild",
      width: 64,
      height: 64,
    });
    editor.execute(command);
    const sprite = editor.getScene().nodes[0]?.components.find(
      (component) => component.type === "Sprite",
    );
    expect(sprite && "assetId" in sprite ? sprite.assetId : undefined).toBe(
      "asset_wild",
    );
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
  });

  it("resizes sprite display size with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Size") });
    const id = editor.createSprite("Hero");
    editor.setSpriteSize(id, { width: 120, height: 80 });
    expect(getSprite(findNodeById(editor.getScene(), id)!)?.width).toBe(120);
    expect(getSprite(findNodeById(editor.getScene(), id)!)?.height).toBe(80);
    editor.undo();
    expect(getSprite(findNodeById(editor.getScene(), id)!)?.width).toBe(64);
    expect(getSprite(findNodeById(editor.getScene(), id)!)?.height).toBe(64);
  });
});

describe("DocumentManager dirty tracking", () => {
  it("becomes clean again after undo to saved content", () => {
    const editor = new Editor({ scene: createEmptyScene("Doc") });
    editor.createSprite("S");
    expect(editor.getDirtyState()).toBe("dirty");
    editor.undo();
    expect(editor.getDirtyState()).toBe("clean");
  });

  it("markSaved updates snapshot used for dirty checks", async () => {
    const editor = new Editor({
      scene: createEmptyScene("Doc"),
      sceneApi: {
        listScenes: async () => [],
        saveScene: async (_id, scene) => scene,
        loadScene: async () => createEmptyScene("unused"),
        createScene: async (_id, scene) => scene,
        renameScene: async (id) => ({ id, path: `assets/scenes/${id}.json` }),
        deleteScene: async () => undefined,
      },
    });
    editor.createSprite("S");
    await editor.saveScene();
    expect(editor.getDirtyState()).toBe("clean");
    editor.undo();
    expect(editor.getDirtyState()).toBe("dirty");
  });

  it("hasUnsavedChanges is true for dirty and save-error", async () => {
    const editor = new Editor({
      scene: createEmptyScene("Doc"),
      sceneApi: {
        listScenes: async () => [],
        saveScene: async () => {
          throw new Error("fail");
        },
        loadScene: async () => createEmptyScene("unused"),
        createScene: async (_id, scene) => scene,
        renameScene: async (id) => ({ id, path: `assets/scenes/${id}.json` }),
        deleteScene: async () => undefined,
      },
    });
    expect(editor.hasUnsavedChanges()).toBe(false);
    editor.createSprite("S");
    expect(editor.hasUnsavedChanges()).toBe(true);
    await expect(editor.saveScene()).rejects.toThrow("fail");
    expect(editor.getDirtyState()).toBe("save-error");
    expect(editor.hasUnsavedChanges()).toBe(true);
  });

  it("Ctrl+S hotkey saves the scene", async () => {
    let saveCount = 0;
    const editor = new Editor({
      scene: createEmptyScene("Doc"),
      sceneApi: {
        listScenes: async () => [],
        saveScene: async (_id, scene) => {
          saveCount += 1;
          return scene;
        },
        loadScene: async () => createEmptyScene("unused"),
        createScene: async (_id, scene) => scene,
        renameScene: async (id) => ({ id, path: `assets/scenes/${id}.json` }),
        deleteScene: async () => undefined,
      },
    });
    editor.createSprite("S");
    expect(editor.getDirtyState()).toBe("dirty");

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    expect(onKeyDown).toBeTypeOf("function");

    const preventDefault = vi.fn();
    onKeyDown!(
      {
        key: "s",
        code: "KeyS",
        ctrlKey: true,
        metaKey: false,
        preventDefault,
      } as unknown as Event,
    );

    await vi.waitFor(() => {
      expect(saveCount).toBe(1);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(editor.getDirtyState()).toBe("clean");
    dispose();
  });

  it("Ctrl+C / Ctrl+V copies and pastes the selected node", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const created = editor.createSprite("Hero");
    editor.selectNodes([created]);

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    const preventDefault = vi.fn();

    onKeyDown!({
      key: "c",
      code: "KeyC",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as Event);

    onKeyDown!({
      key: "v",
      code: "KeyV",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
    expect(editor.getScene().nodes).toHaveLength(2);
    expect(editor.getScene().nodes[1]?.name).toBe("Hero Copy");
    dispose();
  });

  it("Ctrl+S hotkey matches physical KeyS on non-Latin layouts", async () => {
    let saveCount = 0;
    const editor = new Editor({
      scene: createEmptyScene("Doc"),
      sceneApi: {
        listScenes: async () => [],
        saveScene: async (_id, scene) => {
          saveCount += 1;
          return scene;
        },
        loadScene: async () => createEmptyScene("unused"),
        createScene: async (_id, scene) => scene,
        renameScene: async (id) => ({ id, path: `assets/scenes/${id}.json` }),
        deleteScene: async () => undefined,
      },
    });
    editor.createSprite("S");

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    const preventDefault = vi.fn();
    // Ukrainian/Russian layouts report a non-Latin key for the S position.
    onKeyDown!(
      {
        key: "і",
        code: "KeyS",
        ctrlKey: true,
        metaKey: false,
        preventDefault,
      } as unknown as Event,
    );

    await vi.waitFor(() => {
      expect(saveCount).toBe(1);
    });
    expect(preventDefault).toHaveBeenCalled();
    dispose();
  });

  it("arrow keys nudge the selected node by 1px with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 10, y: 20 },
    );
    editor.execute(create);

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    expect(onKeyDown).toBeTypeOf("function");

    const preventDefault = vi.fn();
    onKeyDown!({
      key: "ArrowRight",
      code: "ArrowRight",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as Event);

    const moved = getTransform2D(editor.getScene().nodes[0]!);
    expect(moved?.position).toEqual({
      x: 10 + KEYBOARD_NUDGE_PIXELS,
      y: 20,
    });
    expect(preventDefault).toHaveBeenCalled();

    editor.undo();
    expect(getTransform2D(editor.getScene().nodes[0]!)?.position).toEqual({
      x: 10,
      y: 20,
    });
    dispose();
  });

  it("Shift+arrow keys nudge the selected node by 10px with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 10, y: 20 },
    );
    editor.execute(create);

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    expect(onKeyDown).toBeTypeOf("function");

    const preventDefault = vi.fn();
    onKeyDown!({
      key: "ArrowDown",
      code: "ArrowDown",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: true,
      preventDefault,
    } as unknown as Event);

    const moved = getTransform2D(editor.getScene().nodes[0]!);
    expect(moved?.position).toEqual({
      x: 10,
      y: 20 + KEYBOARD_NUDGE_SHIFT_PIXELS,
    });
    expect(preventDefault).toHaveBeenCalled();

    editor.undo();
    expect(getTransform2D(editor.getScene().nodes[0]!)?.position).toEqual({
      x: 10,
      y: 20,
    });
    dispose();
  });

  it("nudgeSelectedNodes moves multi-selection as one undo step", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const a = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "A",
      { x: 0, y: 0 },
    );
    const b = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "B",
      { x: 5, y: 5 },
    );
    editor.execute(a);
    editor.execute(b);
    editor.selectNodes([a.createdNodeId, b.createdNodeId]);

    expect(editor.nudgeSelectedNodes(0, KEYBOARD_NUDGE_PIXELS)).toBe(true);

    const scene = editor.getScene();
    expect(getTransform2D(findNodeById(scene, a.createdNodeId)!)?.position).toEqual({
      x: 0,
      y: KEYBOARD_NUDGE_PIXELS,
    });
    expect(getTransform2D(findNodeById(scene, b.createdNodeId)!)?.position).toEqual({
      x: 5,
      y: 5 + KEYBOARD_NUDGE_PIXELS,
    });

    editor.undo();
    expect(getTransform2D(findNodeById(editor.getScene(), a.createdNodeId)!)?.position).toEqual({
      x: 0,
      y: 0,
    });
    expect(getTransform2D(findNodeById(editor.getScene(), b.createdNodeId)!)?.position).toEqual({
      x: 5,
      y: 5,
    });
  });

  it("arrow keys do nothing when nothing is selected", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.createSprite("S", { x: 0, y: 0 });
    editor.clearSelection();

    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Window;

    const dispose = editor.bindEditorHotkeys(target);
    const onKeyDown = listeners.get("keydown");
    const preventDefault = vi.fn();
    onKeyDown!({
      key: "ArrowLeft",
      code: "ArrowLeft",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as Event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(getTransform2D(editor.getScene().nodes[0]!)?.position).toEqual({
      x: 0,
      y: 0,
    });
    dispose();
  });
});

describe("EditorViewportController", () => {
  it("syncs create/update/destroy to the renderer", () => {
    const document = new DocumentManager(createEmptyScene("VP"));
    const selection = new SelectionManager();
    const created: string[] = [];
    const updated: string[] = [];
    const destroyed: string[] = [];
    const renderer: SceneRenderer = {
      createNode: (node: SceneNodeData) => {
        created.push(node.id);
      },
      updateNode: (node: SceneNodeData) => {
        updated.push(node.id);
      },
      syncTransform: vi.fn(),
      destroyNode: (nodeId: string) => {
        destroyed.push(nodeId);
      },
      reparentNode: vi.fn(),
      clear: vi.fn(),
      resize: vi.fn(),
      render: vi.fn(),
    };

    const viewport = new EditorViewportController(document);
    viewport.attach(renderer);

    const cmd = new CreateSpriteCommand(document, selection, "N", {
      x: 1,
      y: 2,
    });
    cmd.execute();
    expect(created).toContain(cmd.createdNodeId);

    new SetTransform2DCommand(document, cmd.createdNodeId, {
      position: { x: 9, y: 9 },
    }).execute();
    expect(updated).toContain(cmd.createdNodeId);

    cmd.undo();
    expect(destroyed).toContain(cmd.createdNodeId);
  });
});

describe("editor three commands", () => {
  it("creates Model3D, sets transform and model, undoes", () => {
    const editor = new Editor({
      scene: createEmptyScene("3D", { renderer: "three" }),
    });
    const create = new CreateModel3DCommand(
      editor.document,
      editor.selection,
      {
        name: "Monster",
        position: { x: 1, y: 2 },
        assetId: "asset_glb",
      },
    );
    editor.execute(create);
    const nodeId = create.createdNodeId;
    expect(getModel3D(editor.getScene().nodes[0]!)?.assetId).toBe("asset_glb");

    editor.execute(
      new SetTransform3DCommand(editor.document, nodeId, {
        position: { x: 3, y: 4, z: 5 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      }),
    );
    expect(getTransform3D(findNodeById(editor.getScene(), nodeId)!).position).toEqual({
      x: 3,
      y: 4,
      z: 5,
    });

    editor.execute(
      new SetModel3DCommand(editor.document, nodeId, {
        playing: false,
        loop: false,
        animation: "Walk",
      }),
    );
    expect(getModel3D(findNodeById(editor.getScene(), nodeId)!)).toMatchObject({
      playing: false,
      loop: false,
      animation: "Walk",
    });

    editor.undo();
    expect(getModel3D(findNodeById(editor.getScene(), nodeId)!)?.playing).toBe(
      true,
    );
    editor.undo();
    expect(getTransform3D(findNodeById(editor.getScene(), nodeId)!)?.position).toEqual({
      x: 1,
      y: 0,
      z: 2,
    });
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
  });

  it("sets scene renderer kind with undo", () => {
    const editor = new Editor({ scene: createEmptyScene("R") });
    editor.execute(new SetSceneRendererCommand(editor.document, "hybrid"));
    expect(editor.getScene().renderer).toBe("hybrid");
    editor.undo();
    expect(editor.getScene().renderer).toBeUndefined();
  });

  it("edits camera and light props with undo; activating camera is exclusive", () => {
    const editor = new Editor({
      scene: createEmptyScene("3D", { renderer: "three" }),
    });
    const camA = editor.createNode("three.perspective-camera");
    const camB = editor.createNode("three.perspective-camera");
    const sun = editor.createNode("three.directional-light");
    const ambient = editor.createNode("three.ambient-light");

    editor.setPerspectiveCamera(camA, { fov: 45, active: true });
    expect(getPerspectiveCamera(findNodeById(editor.getScene(), camA)!)?.fov).toBe(
      45,
    );
    expect(
      getPerspectiveCamera(findNodeById(editor.getScene(), camA)!)?.active,
    ).toBe(true);

    editor.setPerspectiveCamera(camB, { active: true });
    expect(
      getPerspectiveCamera(findNodeById(editor.getScene(), camB)!)?.active,
    ).toBe(true);
    expect(
      getPerspectiveCamera(findNodeById(editor.getScene(), camA)!)?.active,
    ).toBeUndefined();

    editor.setDirectionalLight(sun, { intensity: 2.5, color: 0xff0000 });
    expect(
      getDirectionalLight(findNodeById(editor.getScene(), sun)!),
    ).toMatchObject({ intensity: 2.5, color: 0xff0000 });

    editor.setAmbientLight(ambient, { intensity: 0.4 });
    expect(
      getAmbientLight(findNodeById(editor.getScene(), ambient)!)?.intensity,
    ).toBe(0.4);

    editor.undo();
    editor.undo();
    editor.undo();
    expect(
      getPerspectiveCamera(findNodeById(editor.getScene(), camA)!)?.active,
    ).toBe(true);
    expect(
      getPerspectiveCamera(findNodeById(editor.getScene(), camB)!)?.active,
    ).toBeUndefined();
  });
});
