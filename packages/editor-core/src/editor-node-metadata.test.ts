import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  createTransform2D,
  findNodeById,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  applyEditorNodeOverlay,
  createMemoryEditorNodeMetadataStorage,
  descendantNodeIds,
  editorDocumentKey,
  editorNodeMetadataStorageKey,
  emptyEditorSceneNodeMetadata,
  getEditorNodeFlags,
  isHierarchyDropBlockedByLock,
  isNodeEffectivelyHidden,
  isNodeEffectivelyLocked,
  isNodeEffectivelyVisible,
  isNodeHiddenInEditor,
  isNodeLocked,
  parseEditorSceneNodeMetadata,
} from "./editor-node-metadata.js";
import { EditorNodeMetadataStore } from "./editor-node-metadata-store.js";
import { Editor } from "./editor.js";

function sceneWithTree(): {
  scene: SceneData;
  environment: SceneNodeData;
  tree: SceneNodeData;
  rock: SceneNodeData;
} {
  const scene = createEmptyScene("Meta");
  const environment = createSpriteNode("Environment", { x: 0, y: 0 });
  environment.components = [createTransform2D({ position: { x: 0, y: 0 } })];
  const tree = createSpriteNode("Tree", { x: 10, y: 0 });
  tree.parentId = environment.id;
  tree.components = [createTransform2D({ position: { x: 10, y: 0 } })];
  const rock = createSpriteNode("Rock", { x: 20, y: 0 });
  rock.parentId = environment.id;
  rock.components = [createTransform2D({ position: { x: 20, y: 0 } })];
  environment.children = [tree, rock];
  scene.nodes = [environment];
  return { scene, environment, tree, rock };
}

describe("editor node metadata", () => {
  it("defaults missing nodes to visible and unlocked", () => {
    const metadata = emptyEditorSceneNodeMetadata();
    expect(isNodeHiddenInEditor(metadata, "missing")).toBe(false);
    expect(isNodeLocked(metadata, "missing")).toBe(false);
  });

  it("hides a node without mutating descendants' own flags", () => {
    const { scene, environment, tree, rock } = sceneWithTree();
    const metadata = emptyEditorSceneNodeMetadata();
    metadata.nodes[environment.id] = { hidden: true };
    metadata.nodes[tree.id] = { hidden: true };

    expect(isNodeHiddenInEditor(metadata, environment.id)).toBe(true);
    expect(isNodeEffectivelyHidden(scene, metadata, tree.id)).toBe(true);
    expect(isNodeEffectivelyHidden(scene, metadata, rock.id)).toBe(true);
    expect(isNodeHiddenInEditor(metadata, rock.id)).toBe(false);
    expect(isNodeEffectivelyVisible(scene, metadata, environment.id)).toBe(
      false,
    );

    metadata.nodes[environment.id] = {};
    delete metadata.nodes[environment.id];
    expect(isNodeEffectivelyHidden(scene, metadata, tree.id)).toBe(true);
    expect(isNodeEffectivelyHidden(scene, metadata, rock.id)).toBe(false);
    expect(isNodeHiddenInEditor(metadata, tree.id)).toBe(true);
  });

  it("locks a parent without overwriting children lock flags", () => {
    const { scene, environment, tree, rock } = sceneWithTree();
    const metadata = emptyEditorSceneNodeMetadata();
    metadata.nodes[environment.id] = { locked: true };
    metadata.nodes[tree.id] = { locked: true };

    expect(isNodeEffectivelyLocked(scene, metadata, tree.id)).toBe(true);
    expect(isNodeEffectivelyLocked(scene, metadata, rock.id)).toBe(true);
    expect(isNodeLocked(metadata, rock.id)).toBe(false);

    delete metadata.nodes[environment.id];
    expect(isNodeEffectivelyLocked(scene, metadata, tree.id)).toBe(true);
    expect(isNodeEffectivelyLocked(scene, metadata, rock.id)).toBe(false);
  });

  it("reports inherited lock/hide ancestor names", () => {
    const { scene, environment, tree } = sceneWithTree();
    const metadata = emptyEditorSceneNodeMetadata();
    metadata.nodes[environment.id] = { hidden: true, locked: true };
    const flags = getEditorNodeFlags(scene, metadata, tree.id);
    expect(flags.ownHidden).toBe(false);
    expect(flags.effectivelyHidden).toBe(true);
    expect(flags.hiddenByAncestorName).toBe("Environment");
    expect(flags.ownLocked).toBe(false);
    expect(flags.effectivelyLocked).toBe(true);
    expect(flags.lockedByAncestorName).toBe("Environment");
  });

  it("blocks hierarchy drops that mutate a locked tree", () => {
    const { scene, environment, tree, rock } = sceneWithTree();
    const metadata = emptyEditorSceneNodeMetadata();
    metadata.nodes[environment.id] = { locked: true };
    expect(
      isHierarchyDropBlockedByLock(scene, metadata, {
        draggedIds: [tree.id],
        targetId: rock.id,
        placement: "after",
      }),
    ).toBe(true);
    expect(
      isHierarchyDropBlockedByLock(scene, metadata, {
        draggedIds: [rock.id],
        targetId: environment.id,
        placement: "inside",
      }),
    ).toBe(true);

    delete metadata.nodes[environment.id];
    metadata.nodes[tree.id] = { locked: true };
    expect(
      isHierarchyDropBlockedByLock(scene, metadata, {
        draggedIds: [tree.id],
        placement: "root",
      }),
    ).toBe(true);
    expect(
      isHierarchyDropBlockedByLock(scene, metadata, {
        draggedIds: [rock.id],
        targetId: environment.id,
        placement: "inside",
      }),
    ).toBe(false);
  });

  it("ignores stale persisted ids", () => {
    expect(
      parseEditorSceneNodeMetadata({
        version: 1,
        nodes: { gone: { hidden: true }, bad: "nope" },
      })?.nodes.gone,
    ).toEqual({ hidden: true });
    expect(
      parseEditorSceneNodeMetadata({ version: 2, nodes: {} }),
    ).toBeUndefined();
  });

  it("scopes persistence by project and scene", () => {
    expect(editorDocumentKey({ kind: "scene", sceneFileId: "main" })).toBe(
      "scene:main",
    );
    expect(
      editorDocumentKey({
        kind: "prefab",
        assetId: "asset_p",
        prefabId: "prefab_1",
      }),
    ).toBe("prefab:asset_p");
    expect(
      editorNodeMetadataStorageKey("demo", "scene:main"),
    ).toBe("game-editor:node-meta:v1:demo:scene:main");
  });
});

describe("EditorNodeMetadataStore", () => {
  it("persists hide/lock across bindScope and restores per scene", () => {
    const storage = createMemoryEditorNodeMetadataStorage();
    const store = new EditorNodeMetadataStore(storage);
    const { scene, environment, tree } = sceneWithTree();
    store.bindScope("game_a", { kind: "scene", sceneFileId: "one" });
    store.setHidden([environment.id], true);
    store.setLocked([tree.id], true);

    store.bindScope("game_a", { kind: "scene", sceneFileId: "two" });
    expect(isNodeHiddenInEditor(store.getSnapshot(), environment.id)).toBe(
      false,
    );

    store.bindScope("game_a", { kind: "scene", sceneFileId: "one" });
    expect(isNodeHiddenInEditor(store.getSnapshot(), environment.id)).toBe(
      true,
    );
    expect(isNodeLocked(store.getSnapshot(), tree.id)).toBe(true);

    store.showAll(scene);
    expect(isNodeHiddenInEditor(store.getSnapshot(), environment.id)).toBe(
      false,
    );
    expect(isNodeLocked(store.getSnapshot(), tree.id)).toBe(true);
    store.unlockAll(scene);
    expect(isNodeLocked(store.getSnapshot(), tree.id)).toBe(false);
  });

  it("recursive hide writes descendant flags without touching the parent", () => {
    const store = new EditorNodeMetadataStore(
      createMemoryEditorNodeMetadataStorage(),
    );
    const { scene, environment, tree, rock } = sceneWithTree();
    store.bindScope("g", { kind: "scene", sceneFileId: "s" });
    store.setHidden(descendantNodeIds(scene, environment.id), true);
    expect(isNodeHiddenInEditor(store.getSnapshot(), environment.id)).toBe(
      false,
    );
    expect(isNodeHiddenInEditor(store.getSnapshot(), tree.id)).toBe(true);
    expect(isNodeHiddenInEditor(store.getSnapshot(), rock.id)).toBe(true);
  });

  it("prunes deleted node ids", () => {
    const store = new EditorNodeMetadataStore(
      createMemoryEditorNodeMetadataStorage(),
    );
    const { scene, environment, tree } = sceneWithTree();
    store.bindScope("g", { kind: "scene", sceneFileId: "s" });
    store.setHidden([tree.id], true);
    const remaining = structuredClone(environment);
    remaining.children = [];
    store.pruneMissing({ ...scene, nodes: [remaining] });
    expect(store.getSnapshot().nodes[tree.id]).toBeUndefined();
  });
});

describe("Editor node hide/lock façade", () => {
  it("does not mutate serialized scene data when hiding or locking", () => {
    const editor = new Editor({
      scene: sceneWithTree().scene,
    });
    const before = JSON.stringify(editor.getScene());
    const root = editor.getScene().nodes[0]!;
    editor.setNodeHidden(root.id, true);
    editor.setNodeLocked(root.id, true);
    expect(JSON.stringify(editor.getScene())).toBe(before);
    expect(editor.isNodeHiddenInEditor(root.id)).toBe(true);
    expect(editor.isNodeEffectivelyLocked(root.id)).toBe(true);
  });

  it("blocks transform, reparent, delete, and rename while effectively locked", () => {
    const { scene, environment, tree, rock } = sceneWithTree();
    const editor = new Editor({ scene });
    editor.setNodeLocked(environment.id, true);

    const before = findNodeById(editor.getScene(), tree.id)!;
    const transformBefore = before.components.find(
      (component) => component.type === "Transform2D",
    );
    editor.setTransform2D(tree.id, { position: { x: 99, y: 99 } });
    editor.renameNode(tree.id, "Nope");
    editor.duplicateNode(tree.id);
    editor.deleteNode(tree.id);
    editor.moveNode(tree.id, undefined, 0);
    expect(findNodeById(editor.getScene(), tree.id)?.name).toBe("Tree");
    expect(
      findNodeById(editor.getScene(), tree.id)?.components.find(
        (component) => component.type === "Transform2D",
      ),
    ).toEqual(transformBefore);
    expect(findNodeById(editor.getScene(), rock.id)?.parentId).toBe(
      environment.id,
    );

    editor.setNodeLocked(environment.id, false);
    editor.renameNode(tree.id, "Oak");
    expect(findNodeById(editor.getScene(), tree.id)?.name).toBe("Oak");
  });

  it("Show All and Unlock All restore editing", () => {
    const { scene, environment, tree } = sceneWithTree();
    const editor = new Editor({ scene });
    editor.setNodeHidden(environment.id, true);
    editor.setNodeLocked(tree.id, true);
    editor.showAllNodes();
    editor.unlockAllNodes();
    expect(editor.isNodeHiddenInEditor(environment.id)).toBe(false);
    expect(editor.isNodeLocked(tree.id)).toBe(false);
    editor.setTransform2D(tree.id, { position: { x: 3, y: 4 } });
    const transform = findNodeById(editor.getScene(), tree.id)?.components.find(
      (component) => component.type === "Transform2D",
    );
    expect(transform && "position" in transform ? transform.position : undefined).toEqual({
      x: 3,
      y: 4,
    });
  });

  it("child hidden state survives parent hide/show through the Editor API", () => {
    const { scene, environment, tree } = sceneWithTree();
    const editor = new Editor({ scene });
    editor.setNodeHidden(tree.id, true);
    editor.setNodeHidden(environment.id, true);
    expect(editor.isNodeHiddenInEditor(tree.id)).toBe(true);
    editor.setNodeHidden(environment.id, false);
    expect(editor.isNodeHiddenInEditor(tree.id)).toBe(true);
    expect(editor.isNodeEffectivelyVisible(tree.id)).toBe(false);
  });

  it("does not record hide/lock on the undo stack", () => {
    const editor = new Editor({ scene: sceneWithTree().scene });
    const root = editor.getScene().nodes[0]!;
    editor.setNodeHidden(root.id, true);
    expect(editor.undo()).toBe(false);
    expect(editor.isNodeHiddenInEditor(root.id)).toBe(true);
  });

  it("applies overlay flags without rebuilding the renderer graph", () => {
    const { scene, environment, tree } = sceneWithTree();
    const visible = new Map<string, boolean>();
    const locked = new Map<string, boolean>();
    applyEditorNodeOverlay(
      {
        createNode: () => undefined,
        updateNode: () => undefined,
        syncTransform: () => undefined,
        destroyNode: () => undefined,
        reparentNode: () => undefined,
        clear: () => undefined,
        resize: () => undefined,
        render: () => undefined,
        setNodeVisible: (id, value) => {
          visible.set(id, value);
        },
        setNodeLocked: (id, value) => {
          locked.set(id, value);
        },
      },
      scene,
      {
        version: 1,
        nodes: {
          [environment.id]: { hidden: true, locked: true },
        },
      },
    );
    expect(visible.get(environment.id)).toBe(false);
    expect(visible.get(tree.id)).toBe(true);
    expect(locked.get(environment.id)).toBe(true);
    expect(locked.get(tree.id)).toBe(true);
  });

  it("combines serialized visible with editor hide and does not write scene data", () => {
    const { scene, environment, tree } = sceneWithTree();
    tree.visible = false;
    const visible = new Map<string, boolean>();
    applyEditorNodeOverlay(
      {
        createNode: () => undefined,
        updateNode: () => undefined,
        syncTransform: () => undefined,
        destroyNode: () => undefined,
        reparentNode: () => undefined,
        clear: () => undefined,
        resize: () => undefined,
        render: () => undefined,
        setNodeVisible: (id, value) => {
          visible.set(id, value);
        },
      },
      scene,
      {
        version: 1,
        nodes: {
          [environment.id]: { hidden: true },
        },
      },
    );
    expect(visible.get(environment.id)).toBe(false);
    expect(visible.get(tree.id)).toBe(false);
    expect(environment.visible).toBeUndefined();
    expect(tree.visible).toBe(false);
  });
});
