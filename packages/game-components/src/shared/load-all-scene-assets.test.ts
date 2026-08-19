import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  formatLoadAllSceneAssetsText,
  LoadAllSceneAssetsBehaviour,
} from "./load-all-scene-assets.js";
import { createScriptContext } from "../script-context.js";
import type { ScriptCreateContext } from "../types.js";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_text",
    componentId: "comp_1",
    scriptId: "shared.LoadAllSceneAssets",
    properties,
    services,
  });
}

describe("formatLoadAllSceneAssetsText", () => {
  it("replaces the percent placeholder", () => {
    expect(formatLoadAllSceneAssetsText("{percent}%", 42)).toBe("42%");
    expect(formatLoadAllSceneAssetsText("Loading {percent}%", 100)).toBe(
      "Loading 100%",
    );
  });
});

describe("LoadAllSceneAssetsBehaviour", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads listed asset ids, updates text, and emits completeEvent", async () => {
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on("loading.complete", complete);
    const setText = vi.fn();
    const preloadSceneAsset = vi.fn(async () => undefined);

    const behaviour = new LoadAllSceneAssetsBehaviour(
      createContext(
        {},
        {
          bus,
          changeScene: () => undefined,
          setText,
          listAllSceneAssetIds: () => ["asset_a", "asset_b"],
          preloadSceneAsset,
        },
      ),
    );
    behaviour.start();

    expect(setText).toHaveBeenCalledWith("node_text", "0%");

    await vi.waitFor(() => {
      expect(complete).toHaveBeenCalledTimes(1);
    });
    expect(preloadSceneAsset).toHaveBeenCalledTimes(2);
    expect(setText).toHaveBeenCalledWith("node_text", "100%");

    behaviour.destroy();
  });

  it("falls back to fetch when the host has no preloadSceneAsset", async () => {
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on("loading.complete", complete);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const behaviour = new LoadAllSceneAssetsBehaviour(
      createContext(
        {},
        {
          bus,
          changeScene: () => undefined,
          setText: vi.fn(),
          listAllSceneAssetIds: () => ["asset_a"],
          resolveAssetUrl: (assetId) => `/${assetId}.png`,
        },
      ),
    );
    behaviour.start();

    await vi.waitFor(() => {
      expect(complete).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    behaviour.destroy();
  });

  it("reaches 100% immediately when there are no scene assets", async () => {
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on("loading.complete", complete);
    const setText = vi.fn();

    const behaviour = new LoadAllSceneAssetsBehaviour(
      createContext(
        { template: "Loading {percent}%" },
        {
          bus,
          changeScene: () => undefined,
          setText,
          listAllSceneAssetIds: () => [],
        },
      ),
    );
    behaviour.start();

    await vi.waitFor(() => {
      expect(complete).toHaveBeenCalledTimes(1);
    });
    expect(setText).toHaveBeenCalledWith("node_text", "Loading 100%");
    behaviour.destroy();
  });

  it("does not emit after destroy", async () => {
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on("loading.complete", complete);
    let resolvePreload: (() => void) | undefined;

    const behaviour = new LoadAllSceneAssetsBehaviour(
      createContext(
        {},
        {
          bus,
          changeScene: () => undefined,
          setText: vi.fn(),
          listAllSceneAssetIds: () => ["asset_a"],
          preloadSceneAsset: () =>
            new Promise((resolve) => {
              resolvePreload = () => resolve();
            }),
        },
      ),
    );
    behaviour.start();
    behaviour.destroy();
    resolvePreload?.();
    await Promise.resolve();
    expect(complete).not.toHaveBeenCalled();
  });
});
