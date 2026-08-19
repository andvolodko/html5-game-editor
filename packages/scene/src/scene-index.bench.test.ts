import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode } from "./factories/scene.js";
import { SceneIndex } from "./scene-index.js";
import type { SceneNodeData } from "./types.js";

const LARGE_NODE_COUNT = 10_000;
const LOOKUP_COUNT = 10_000;

function buildWideScene(nodeCount: number): {
  scene: ReturnType<typeof createEmptyScene>;
  ids: string[];
} {
  const scene = createEmptyScene("Bench");
  const ids: string[] = [];
  const nodes: SceneNodeData[] = [];
  for (let index = 0; index < nodeCount; index += 1) {
    const node = createSpriteNode(`N${String(index)}`);
    ids.push(node.id);
    nodes.push(node);
  }
  scene.nodes = nodes;
  return { scene, ids };
}

describe("SceneIndex benchmarks", () => {
  it("records rebuild and lookup duration for a large scene", () => {
    const { scene, ids } = buildWideScene(LARGE_NODE_COUNT);
    const index = new SceneIndex();

    const rebuildStarted = performance.now();
    index.rebuild(scene);
    const rebuildMs = performance.now() - rebuildStarted;

    const lookupStarted = performance.now();
    let found = 0;
    for (let step = 0; step < LOOKUP_COUNT; step += 1) {
      const id = ids[step % ids.length];
      if (id !== undefined && index.getNode(id)) {
        found += 1;
      }
    }
    const lookupMs = performance.now() - lookupStarted;

    expect(found).toBe(LOOKUP_COUNT);
    expect(rebuildMs).toBeGreaterThanOrEqual(0);
    expect(lookupMs).toBeGreaterThanOrEqual(0);
  });

  it("records incremental add, reparent, and remove duration", () => {
    const mutationCount = 1_000;
    const scene = createEmptyScene("Mutations");
    const parent = createSpriteNode("Parent");
    scene.nodes = [parent];
    const index = new SceneIndex();
    index.rebuild(scene);

    const addStarted = performance.now();
    const ids: string[] = [];
    for (let step = 0; step < mutationCount; step += 1) {
      const node = createSpriteNode(`C${String(step)}`);
      node.parentId = parent.id;
      parent.children.push(node);
      index.addNode(node);
      ids.push(node.id);
    }
    const addMs = performance.now() - addStarted;
    expect(index.hasNode(ids[ids.length - 1]!)).toBe(true);

    const reparentStarted = performance.now();
    for (const id of ids) {
      index.reparentNode(id, undefined);
    }
    const reparentMs = performance.now() - reparentStarted;

    const removeStarted = performance.now();
    for (const id of ids) {
      index.removeNode(id);
    }
    const removeMs = performance.now() - removeStarted;
    expect(index.hasNode(ids[0]!)).toBe(false);

    expect(addMs).toBeGreaterThanOrEqual(0);
    expect(reparentMs).toBeGreaterThanOrEqual(0);
    expect(removeMs).toBeGreaterThanOrEqual(0);
  });
});
