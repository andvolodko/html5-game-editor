import { describe, expect, it } from "vitest";
import {
  NodeTypeRegistry,
  registerPixiNodeTypes,
  registerThreeNodeTypes,
  resolveCreateParentId,
} from "./index.js";
import {
  createEmptyScene,
  createSpriteNode,
  createContainerNode,
  nodeCanHaveChildren,
  parseSceneData,
} from "@game-editor/scene";

describe("NodeTypeRegistry", () => {
  it("registers, looks up, and orders categories", () => {
    const registry = new NodeTypeRegistry();
    registerPixiNodeTypes(registry);
    expect(registry.get("pixi.sprite")?.label).toBe("Sprite");
    expect(registry.has("pixi.particle-container")).toBe(false);
    const groups = registry.listMenuGroups();
    expect(groups.map((g) => g.category)).toEqual([
      "Container",
      "Sprites",
      "Spine",
      "Tilemap",
      "Text",
      "Graphics",
      "Mesh",
    ]);
    expect(groups[0]?.types.map((t) => t.id)).toEqual([
      "pixi.container",
      "pixi.hit-zone",
      "pixi.mask",
    ]);
    expect(groups[1]?.types.map((t) => t.id)).toContain("pixi.animated-sprite");
  });

  it("groups creatable types by PIXI then THREE", () => {
    const registry = new NodeTypeRegistry();
    registerPixiNodeTypes(registry);
    registerThreeNodeTypes(registry);
    const groups = registry.listRendererMenuGroups();
    expect(groups.map((g) => g.renderer)).toEqual(["pixi", "three"]);
    expect(groups[0]?.types.map((t) => t.id)).toContain("pixi.sprite");
    expect(groups[0]?.types.every((t) => t.renderer === "pixi")).toBe(true);
    expect(groups[1]?.types.map((t) => t.id)).toContain("three.model");
    expect(groups[1]?.types.every((t) => t.renderer === "three")).toBe(true);
  });

  it("rejects duplicate registration", () => {
    const registry = new NodeTypeRegistry();
    registerPixiNodeTypes(registry);
    expect(() => registerPixiNodeTypes(registry)).toThrow(/duplicate/);
  });

  it("throws on unknown type", () => {
    const registry = new NodeTypeRegistry();
    expect(() => registry.require("pixi.nope")).toThrow(/unknown/);
  });

  it("exposes canHaveChildren metadata", () => {
    const registry = new NodeTypeRegistry();
    registerPixiNodeTypes(registry);
    expect(registry.require("pixi.container").canHaveChildren).toBe(true);
    expect(registry.require("pixi.sprite").canHaveChildren).toBe(false);
    expect(registry.require("pixi.text").canHaveChildren).toBe(false);
  });
});

describe("node creation from registry", () => {
  const registry = new NodeTypeRegistry();
  registerPixiNodeTypes(registry);

  const typeIds = registry.list().map((d) => d.id);

  it.each(typeIds)("creates valid SceneNodeData for %s", (typeId) => {
    const def = registry.require(typeId);
    const node = def.createDefaultNode({
      name: def.label,
      position: { x: 10, y: 20 },
    });
    expect(node.name).toBe(def.label);
    expect(nodeCanHaveChildren(node)).toBe(def.canHaveChildren);
    const scene = createEmptyScene("t");
    scene.nodes.push(node);
    expect(() => parseSceneData(JSON.parse(JSON.stringify(scene)))).not.toThrow();
  });
});

describe("resolveCreateParentId", () => {
  it("creates under container, sibling of leaf, or root", () => {
    const scene = createEmptyScene("p");
    const container = createContainerNode("C");
    const sprite = createSpriteNode("S", { x: 0, y: 0 });
    sprite.parentId = container.id;
    container.children = [sprite];
    scene.nodes = [container];

    expect(resolveCreateParentId(scene, undefined)).toBeUndefined();
    expect(resolveCreateParentId(scene, container.id)).toBe(container.id);
    expect(resolveCreateParentId(scene, sprite.id)).toBe(container.id);
  });
});
