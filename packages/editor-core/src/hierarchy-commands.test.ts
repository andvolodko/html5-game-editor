import { describe, expect, it, vi } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  createContainerNode,
  createTransform2D,
  findNodeById,
  getSprite,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import {
  CreateContainerCommand,
  DeleteNodeCommand,
  DuplicateNodeCommand,
  Editor,
  EditorViewportController,
  DocumentManager,
  MoveNodeCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  createDeleteSelectionCommand,
} from "./index.js";

function treeScene() {
  const scene = createEmptyScene("T");
  const game = createSpriteNode("Game", { x: 0, y: 0 });
  game.components = [createTransform2D({ position: { x: 0, y: 0 } })];
  const reels = createSpriteNode("Reels", { x: 10, y: 0 });
  reels.parentId = game.id;
  const effects = createSpriteNode("Effects", { x: 20, y: 0 });
  effects.parentId = game.id;
  game.children = [reels, effects];
  scene.nodes = [game];
  return { scene, game, reels, effects };
}

describe("hierarchy CRUD commands", () => {
  it("renames scene with undo/redo", () => {
    const editor = new Editor({ scene: createEmptyScene("Main Scene") });
    editor.selectScene();
    editor.execute(new SetSceneNameCommand(editor.document, "  Level 1  "));
    expect(editor.getScene().name).toBe("Level 1");
    expect(editor.getDirtyState()).toBe("dirty");
    editor.undo();
    expect(editor.getScene().name).toBe("Main Scene");
    expect(editor.getDirtyState()).toBe("clean");
    editor.redo();
    expect(editor.getScene().name).toBe("Level 1");
  });

  it("restores scene selection when undoing create from scene selection", () => {
    const editor = new Editor({ scene: createEmptyScene("Main Scene") });
    editor.selectScene();
    expect(editor.selection.isSceneSelected()).toBe(true);
    editor.createContainer();
    expect(editor.selection.isSceneSelected()).toBe(false);
    expect(editor.selection.getSelectedNodeIds()).toHaveLength(1);
    editor.undo();
    expect(editor.selection.isSceneSelected()).toBe(true);
    expect(editor.selection.getSelectedNodeIds()).toEqual([]);
  });

  it("renames with undo/redo and stable id", () => {
    const editor = new Editor({ scene: createEmptyScene("R") });
    const id = editor.createSprite("Hero");
    editor.execute(new RenameNodeCommand(editor.document, id, "  MainHero  "));
    expect(findNodeById(editor.getScene(), id)?.name).toBe("MainHero");
    editor.undo();
    expect(findNodeById(editor.getScene(), id)?.name).toBe("Hero");
    editor.redo();
    expect(findNodeById(editor.getScene(), id)?.name).toBe("MainHero");
    expect(findNodeById(editor.getScene(), id)?.id).toBe(id);
  });

  it("reverts empty rename to previous name", () => {
    const editor = new Editor({ scene: createEmptyScene("R") });
    const id = editor.createSprite("Hero");
    editor.execute(new RenameNodeCommand(editor.document, id, "   "));
    expect(findNodeById(editor.getScene(), id)?.name).toBe("Hero");
  });

  it("creates container child under parent", () => {
    const { scene, game } = treeScene();
    const editor = new Editor({ scene });
    const cmd = new CreateContainerCommand(editor.document, editor.selection, game.id);
    editor.execute(cmd);
    expect(findNodeById(editor.getScene(), game.id)?.children.map((n) => n.id)).toContain(
      cmd.createdNodeId,
    );
    expect(editor.selection.getPrimaryNodeId()).toBe(cmd.createdNodeId);
    editor.undo();
    expect(findNodeById(editor.getScene(), cmd.createdNodeId)).toBeUndefined();
  });

  it("deletes subtree and restores exact ids/index", () => {
    const { scene, game, reels, effects } = treeScene();
    const editor = new Editor({ scene });
    editor.selectNodes([reels.id]);
    const reelChildIds = reels.children.map((c) => c.id);
    editor.execute(new DeleteNodeCommand(editor.document, editor.selection, reels.id));
    expect(findNodeById(editor.getScene(), reels.id)).toBeUndefined();
    expect(editor.selection.getSelectedNodeIds()).toEqual([effects.id]);
    editor.undo();
    const restored = findNodeById(editor.getScene(), reels.id);
    expect(restored?.id).toBe(reels.id);
    expect(restored?.children.map((c) => c.id)).toEqual(reelChildIds);
    expect(findNodeById(editor.getScene(), game.id)?.children.map((n) => n.id)).toEqual([
      reels.id,
      effects.id,
    ]);
  });

  it("duplicates subtree with new ids and same asset refs", () => {
    const editor = new Editor({ scene: createEmptyScene("D") });
    const id = editor.createSprite("Wild");
    const node = findNodeById(editor.getScene(), id)!;
    const sprite = getSprite(node)!;
    sprite.assetId = "asset_wild";

    const cmd = new DuplicateNodeCommand(editor.document, editor.selection, id);
    editor.execute(cmd);
    expect(cmd.createdNodeId).not.toBe(id);
    const dup = findNodeById(editor.getScene(), cmd.createdNodeId)!;
    expect(dup.name).toBe("Wild Copy");
    expect(getSprite(dup)?.assetId).toBe("asset_wild");
    expect(editor.getScene().nodes.map((n) => n.id)).toEqual([id, cmd.createdNodeId]);

    const dupId = cmd.createdNodeId;
    editor.undo();
    expect(findNodeById(editor.getScene(), dupId)).toBeUndefined();
    editor.redo();
    expect(findNodeById(editor.getScene(), dupId)?.id).toBe(dupId);
  });

  it("multi-delete uses root-most normalization", () => {
    const { scene, game, reels } = treeScene();
    const editor = new Editor({ scene });
    editor.selectNodes([game.id, reels.id]);
    const command = createDeleteSelectionCommand(editor.document, editor.selection);
    expect(command?.name).toBe("DeleteNode");
    editor.execute(command!);
    expect(editor.getScene().nodes).toHaveLength(0);
    editor.undo();
    expect(findNodeById(editor.getScene(), game.id)?.children).toHaveLength(2);
  });

  it("multi-delete cousins is one DeleteNodes undo step", () => {
    const scene = createEmptyScene("M");
    const a = createSpriteNode("A", { x: 0, y: 0 });
    const b = createSpriteNode("B", { x: 10, y: 0 });
    scene.nodes = [a, b];
    const editor = new Editor({ scene });
    editor.selectNodes([a.id, b.id]);
    const command = createDeleteSelectionCommand(editor.document, editor.selection);
    expect(command?.name).toBe("DeleteNodes");
    editor.execute(command!);
    expect(editor.getScene().nodes).toHaveLength(0);
    editor.undo();
    expect(editor.getScene().nodes.map((n) => n.id).sort()).toEqual(
      [a.id, b.id].sort(),
    );
    expect(editor.selection.getSelectedNodeIds()).toEqual([a.id, b.id]);
  });

  it("create/duplicate undo restores prior selection", () => {
    const editor = new Editor({ scene: createEmptyScene("S") });
    const first = editor.createSprite("First");
    editor.selectNodes([first]);
    const second = editor.createSprite("Second");
    expect(editor.selection.getPrimaryNodeId()).toBe(second);
    editor.undo();
    expect(editor.selection.getSelectedNodeIds()).toEqual([first]);

    editor.duplicateNode(first);
    const afterDup = editor.selection.getPrimaryNodeId();
    expect(afterDup).toBeTruthy();
    editor.undo();
    expect(editor.selection.getSelectedNodeIds()).toEqual([first]);
  });

  it("setScene clears undo history holding live graphs", () => {
    const editor = new Editor({ scene: createEmptyScene("L") });
    editor.createSprite("A");
    expect(editor.commands.canUndo).toBe(true);
    editor.setScene(createEmptyScene("Loaded"));
    expect(editor.commands.canUndo).toBe(false);
    expect(editor.selection.getSelectedNodeIds()).toEqual([]);
  });

  it("rename does not call renderer updateNode", () => {
    const document = new DocumentManager(createEmptyScene("R"));
    const updateNode = vi.fn();
    const renderer: SceneRenderer = {
      createNode: vi.fn(),
      updateNode,
      syncTransform: vi.fn(),
      destroyNode: vi.fn(),
      reparentNode: vi.fn(),
      clear: vi.fn(),
      resize: vi.fn(),
      render: vi.fn(),
    };
    const viewport = new EditorViewportController(document);
    viewport.attach(renderer);
    const node = createSpriteNode("N", { x: 0, y: 0 });
    document.insertNode(node, undefined, 0);
    updateNode.mockClear();
    document.renameNode(node.id, "Renamed");
    expect(updateNode).not.toHaveBeenCalled();
  });
});

describe("incremental viewport sync", () => {
  it("reparents without full rebuild and preserves create counts", () => {
    const document = new DocumentManager(createEmptyScene("VP"));
    const instances = new Map<string, object>();
    let rebuildViaClear = 0;
    const renderer: SceneRenderer = {
      createNode: (node: SceneNodeData) => {
        if (!instances.has(node.id)) {
          instances.set(node.id, { id: node.id });
        }
      },
      updateNode: vi.fn(),
      syncTransform: vi.fn(),
      destroyNode: (nodeId: string) => {
        instances.delete(nodeId);
      },
      reparentNode: vi.fn(),
      clear: () => {
        rebuildViaClear += 1;
        instances.clear();
      },
      resize: vi.fn(),
      render: vi.fn(),
    };

    const viewport = new EditorViewportController(document);
    viewport.attach(renderer);
    const clearAfterAttach = rebuildViaClear;

    const a = createContainerNode("A");
    const b = createSpriteNode("B", { x: 10, y: 0 });
    document.insertNode(a, undefined, 0);
    document.insertNode(b, undefined, 1);
    const beforeA = instances.get(a.id);
    expect(beforeA).toBeTruthy();

    new MoveNodeCommand(document, {
      nodeId: b.id,
      toParentId: a.id,
      toIndex: 0,
    }).execute();

    expect(renderer.reparentNode).toHaveBeenCalled();
    expect(instances.get(a.id)).toBe(beforeA);
    expect(rebuildViaClear).toBe(clearAfterAttach);
    expect(viewport.getFullRebuildCount()).toBe(1);
  });
});
