import { describe, expect, it, vi } from "vitest";
import type { SceneNodeData, SceneRenderer } from "@game-editor/scene";
import { RuntimeRendererHost } from "./runtime-renderer-host.js";

function stubRenderer(): SceneRenderer {
  return {
    createNode: vi.fn(),
    updateNode: vi.fn(),
    syncTransform: vi.fn(),
    destroyNode: vi.fn(),
    reparentNode: vi.fn(),
    clear: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
  };
}

describe("RuntimeRendererHost", () => {
  it("caches renderer order by layer.order", () => {
    const host = new RuntimeRendererHost();
    const late = stubRenderer();
    const early = stubRenderer();
    host.register({
      kind: "three",
      renderer: late,
      layer: { id: "three", renderer: "three", order: 100 },
    });
    host.register({
      kind: "pixi",
      renderer: early,
      layer: { id: "pixi", renderer: "pixi", order: 0 },
    });

    expect(host.getOrdered().map((entry) => entry.layer.id)).toEqual([
      "pixi",
      "three",
    ]);
    expect(host.getOrdered()).toBe(host.getOrdered());
  });

  it("rebuilds the cached order when a renderer is added or cleared", () => {
    const host = new RuntimeRendererHost();
    host.register({
      kind: "pixi",
      renderer: stubRenderer(),
      layer: { id: "fg", renderer: "pixi", order: 200 },
    });
    const first = host.getOrdered();
    host.register({
      kind: "pixi",
      renderer: stubRenderer(),
      layer: { id: "bg", renderer: "pixi", order: 0 },
    });
    expect(host.getOrdered()).not.toBe(first);
    expect(host.getOrdered().map((entry) => entry.layer.id)).toEqual([
      "bg",
      "fg",
    ]);
    host.clear();
    expect(host.getOrdered()).toEqual([]);
  });

  it("kinds() is unique and follows cached order", () => {
    const host = new RuntimeRendererHost();
    host.register({
      kind: "pixi",
      renderer: stubRenderer(),
      layer: { id: "fg", renderer: "pixi", order: 200 },
      accepts: (node: SceneNodeData) => node.layer === "foreground",
    });
    host.register({
      kind: "pixi",
      renderer: stubRenderer(),
      layer: { id: "bg", renderer: "pixi", order: 0 },
    });
    expect(host.kinds()).toEqual(["pixi"]);
  });
});
