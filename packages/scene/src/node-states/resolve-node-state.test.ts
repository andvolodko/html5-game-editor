import { describe, expect, it } from "vitest";
import { createSpriteNode } from "../factories.js";
import { getTransform2D } from "../queries.js";
import { parseSceneData } from "../schema.js";
import { SCENE_SCHEMA_VERSION } from "../types.js";
import {
  applyNodeStateOverridesMapEntry,
  BASE_NODE_STATE_ID,
  diffTransform2DOverride,
  isNodeStatePropertyOverridden,
  mergeNodeStateOverrides,
  pruneNodeStateOverrides,
  resetNodeStateProperty,
  resolveNodeState,
  setNodeStatePropertyOverride,
} from "./index.js";

const PORTRAIT = "state_portrait";
const LANDSCAPE = "state_landscape";

describe("resolveNodeState", () => {
  it("returns Base values when no state is active", () => {
    const node = createSpriteNode("Hero", { x: 100, y: 200 });
    const transform = getTransform2D(node)!;
    transform.scale = { x: 2, y: 2 };
    transform.rotation = 15;
    node.alpha = 0.8;
    node.visible = false;

    const resolved = resolveNodeState(node, BASE_NODE_STATE_ID);
    expect(resolved.visible).toBe(false);
    expect(resolved.alpha).toBe(0.8);
    expect(resolved.transform2D).toEqual({
      position: { x: 100, y: 200 },
      rotation: 15,
      scale: { x: 2, y: 2 },
    });
  });

  it("applies a full state override", () => {
    const node = createSpriteNode("Hero", { x: 100, y: 200 });
    node.stateOverrides = {
      [PORTRAIT]: {
        visible: false,
        alpha: 0.5,
        transform2D: {
          position: { x: 10, y: 620 },
          rotation: 90,
          scale: { x: 0.8, y: 0.8 },
        },
      },
    };

    const resolved = resolveNodeState(node, PORTRAIT);
    expect(resolved.visible).toBe(false);
    expect(resolved.alpha).toBe(0.5);
    expect(resolved.transform2D).toEqual({
      position: { x: 10, y: 620 },
      rotation: 90,
      scale: { x: 0.8, y: 0.8 },
    });
  });

  it("applies a partial override and falls back to Base", () => {
    const node = createSpriteNode("Hero", { x: 100, y: 200 });
    const transform = getTransform2D(node)!;
    transform.scale = { x: 1, y: 1 };
    transform.rotation = 0;
    node.stateOverrides = {
      [PORTRAIT]: {
        transform2D: {
          position: { y: 620 },
          scale: { x: 0.8, y: 0.8 },
        },
      },
    };

    const resolved = resolveNodeState(node, PORTRAIT);
    expect(resolved.transform2D).toEqual({
      position: { x: 100, y: 620 },
      rotation: 0,
      scale: { x: 0.8, y: 0.8 },
    });
    expect(resolved.visible).toBe(true);
    expect(resolved.alpha).toBe(1);
  });

  it("restores Base channels when switching Damaged → Selected", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    const transform = getTransform2D(node)!;
    transform.scale = { x: 1, y: 1 };
    node.alpha = 1;
    node.stateOverrides = {
      damaged: {
        alpha: 0.5,
      },
      selected: {
        transform2D: {
          scale: { x: 1.2, y: 1.2 },
        },
      },
    };

    const damaged = resolveNodeState(node, "damaged");
    expect(damaged.alpha).toBe(0.5);
    expect(damaged.transform2D?.scale).toEqual({ x: 1, y: 1 });

    const selected = resolveNodeState(node, "selected");
    expect(selected.alpha).toBe(1);
    expect(selected.transform2D?.scale).toEqual({ x: 1.2, y: 1.2 });

    const base = resolveNodeState(node, BASE_NODE_STATE_ID);
    expect(base.alpha).toBe(1);
    expect(base.transform2D?.scale).toEqual({ x: 1, y: 1 });
  });

  it("reports overridden property paths", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.stateOverrides = {
      [PORTRAIT]: {
        transform2D: { position: { y: 600 } },
        alpha: 0.5,
      },
    };
    expect(isNodeStatePropertyOverridden(node, PORTRAIT, "transform2D.position.y")).toBe(
      true,
    );
    expect(isNodeStatePropertyOverridden(node, PORTRAIT, "transform2D.position.x")).toBe(
      false,
    );
    expect(isNodeStatePropertyOverridden(node, PORTRAIT, "alpha")).toBe(true);
    expect(isNodeStatePropertyOverridden(node, BASE_NODE_STATE_ID, "alpha")).toBe(false);
  });
});

describe("diffTransform2DOverride", () => {
  it("omits channels that match Base", () => {
    const node = createSpriteNode("Hero", { x: 100, y: 100 });
    const base = getTransform2D(node)!;
    const sparse = diffTransform2DOverride(base, {
      position: { x: 100, y: 600 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    });
    expect(sparse).toEqual({
      position: { y: 600 },
    });
  });
});

describe("pruneNodeStateOverrides", () => {
  it("removes empty nested objects and empty map entries after reset", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    const overrides = mergeNodeStateOverrides(undefined, {
      transform2D: { position: { y: 600 } },
    });
    applyNodeStateOverridesMapEntry(node, PORTRAIT, overrides);
    expect(node.stateOverrides?.[PORTRAIT]).toBeDefined();

    const bag = node.stateOverrides![PORTRAIT]!;
    resetNodeStateProperty(bag, "transform2D.position.y");
    pruneNodeStateOverrides(node);
    expect(node.stateOverrides).toBeUndefined();
  });

  it("keeps sibling override channels when resetting one path", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    const overrides = {
      alpha: 0.5,
      transform2D: { position: { x: 10, y: 20 } },
    };
    applyNodeStateOverridesMapEntry(node, PORTRAIT, overrides);
    const bag = node.stateOverrides![PORTRAIT]!;
    resetNodeStateProperty(bag, "transform2D.position.y");
    pruneNodeStateOverrides(node);
    expect(node.stateOverrides?.[PORTRAIT]).toEqual({
      alpha: 0.5,
      transform2D: { position: { x: 10 } },
    });
  });
});

describe("setNodeStatePropertyOverride", () => {
  it("writes nested paths into a sparse bag", () => {
    const bag = {};
    setNodeStatePropertyOverride(bag, "transform2D.position.y", 620);
    setNodeStatePropertyOverride(bag, "alpha", 0.4);
    expect(bag).toEqual({
      alpha: 0.4,
      transform2D: { position: { y: 620 } },
    });
  });
});

describe("scene schema with states", () => {
  it("parses scenes without states exactly as before", () => {
    const sprite = createSpriteNode("Hero", { x: 0, y: 0 });
    const parsed = parseSceneData({
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: sprite.id,
          name: sprite.name,
          components: sprite.components,
          children: [],
        },
      ],
    });
    expect(parsed.states).toBeUndefined();
    expect(parsed.nodes[0]?.stateOverrides).toBeUndefined();
  });

  it("round-trips scene catalog and node overrides", () => {
    const sprite = createSpriteNode("Hero", { x: 100, y: 200 });
    const scene = {
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      states: [
        { id: PORTRAIT, name: "Portrait", viewport: { width: 1080, height: 1920 } },
        { id: LANDSCAPE, name: "Landscape" },
      ],
      nodes: [
        {
          id: sprite.id,
          name: sprite.name,
          components: sprite.components,
          children: [],
          stateOverrides: {
            [PORTRAIT]: {
              transform2D: { position: { y: 620 }, scale: { x: 0.8, y: 0.8 } },
            },
          },
        },
      ],
    };
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(parsed.states).toEqual(scene.states);
    expect(parsed.nodes[0]?.stateOverrides).toEqual(scene.nodes[0].stateOverrides);
  });

  it("rejects unknown override keys", () => {
    const sprite = createSpriteNode("Hero", { x: 0, y: 0 });
    expect(() =>
      parseSceneData({
        id: "scene_1",
        name: "Demo",
        version: SCENE_SCHEMA_VERSION,
        nodes: [
          {
            id: sprite.id,
            name: sprite.name,
            components: sprite.components,
            children: [],
            stateOverrides: {
              [PORTRAIT]: { tint: 0xff0000 },
            },
          },
        ],
      }),
    ).toThrow();
  });
});
