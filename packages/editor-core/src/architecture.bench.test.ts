import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode, type SceneNodeData } from "@game-editor/scene";
import { Editor } from "./editor.js";

const LARGE_NODE_COUNT = 10_000;
const MUTATION_COUNT = 1_000;

function buildWideScene(nodeCount: number) {
  const scene = createEmptyScene("Bench");
  const nodes: SceneNodeData[] = [];
  for (let index = 0; index < nodeCount; index += 1) {
    nodes.push(createSpriteNode(`N${String(index)}`));
  }
  scene.nodes = nodes;
  return scene;
}

describe("architecture benchmarks", () => {
  it("records large scene load, mutations, undo/redo, and serialize duration", () => {
    const loadedScene = buildWideScene(LARGE_NODE_COUNT);
    const loadStarted = performance.now();
    const loaded = new Editor({ scene: loadedScene });
    const loadMs = performance.now() - loadStarted;
    expect(loaded.document.getNode(loadedScene.nodes[0]!.id)).toBeDefined();

    const editor = new Editor({ scene: createEmptyScene("Mutations") });
    const createStarted = performance.now();
    const createdIds: string[] = [];
    for (let index = 0; index < MUTATION_COUNT; index += 1) {
      createdIds.push(editor.createSprite(`N${String(index)}`));
    }
    const createMs = performance.now() - createStarted;
    expect(createdIds).toHaveLength(MUTATION_COUNT);

    const folderId = editor.createContainer();
    const reparentStarted = performance.now();
    for (let index = 0; index < createdIds.length; index += 1) {
      editor.moveNode(createdIds[index]!, folderId, index);
    }
    const reparentMs = performance.now() - reparentStarted;
    expect(editor.document.getNode(folderId)?.children).toHaveLength(MUTATION_COUNT);

    const undoStarted = performance.now();
    let undone = 0;
    while (editor.undo()) {
      undone += 1;
    }
    const undoMs = performance.now() - undoStarted;
    expect(undone).toBeGreaterThan(0);

    const redoStarted = performance.now();
    let redone = 0;
    while (editor.redo()) {
      redone += 1;
    }
    const redoMs = performance.now() - redoStarted;
    expect(redone).toBe(undone);

    const serializeStarted = performance.now();
    const json = JSON.stringify(editor.getScene());
    const serializeMs = performance.now() - serializeStarted;
    expect(json.length).toBeGreaterThan(0);

    const deleteStarted = performance.now();
    editor.selectNodes([folderId]);
    editor.deleteSelectedNodes();
    const deleteMs = performance.now() - deleteStarted;
    expect(editor.document.getNode(folderId)).toBeUndefined();

    expect(loadMs).toBeGreaterThanOrEqual(0);
    expect(createMs).toBeGreaterThanOrEqual(0);
    expect(reparentMs).toBeGreaterThanOrEqual(0);
    expect(undoMs).toBeGreaterThanOrEqual(0);
    expect(redoMs).toBeGreaterThanOrEqual(0);
    expect(serializeMs).toBeGreaterThanOrEqual(0);
    expect(deleteMs).toBeGreaterThanOrEqual(0);
  });
});
