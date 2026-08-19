import { beforeEach, describe, expect, it, vi } from "vitest";

const unload = vi.fn(async () => undefined);
const cacheHas = vi.fn(() => true);
const load = vi.fn(async () => {
  return {
    destroy: vi.fn(),
  };
});

vi.mock("pixi.js", () => ({
  Assets: {
    load: (...args: unknown[]) => load(...args),
    unload: (...args: unknown[]) => unload(...args),
    cache: {
      has: (url: string) => cacheHas(url),
    },
  },
}));

import {
  PixiTextureCache,
  resetPixiTextureUrlRetainsForTests,
  retainPreloadedPixiUrl,
} from "./pixi-texture-cache.js";

describe("PixiTextureCache", () => {
  beforeEach(() => {
    resetPixiTextureUrlRetainsForTests();
    unload.mockClear();
    load.mockClear();
    cacheHas.mockClear();
    cacheHas.mockReturnValue(true);
    load.mockImplementation(async () => ({ destroy: vi.fn() }));
  });

  it("does not unload a shared URL while another cache still retains it", async () => {
    const scene = new PixiTextureCache();
    const preview = new PixiTextureCache();
    const url = "/assets/asset_1/content?v=1";

    await scene.load("asset_1", url, "png");
    await preview.load("asset_1", url, "png");

    preview.evictAll();
    expect(unload).not.toHaveBeenCalled();

    scene.evictAll();
    expect(unload).toHaveBeenCalledTimes(1);
    expect(unload).toHaveBeenCalledWith(url);
  });

  it("unloads immediately when the sole retainer evicts", async () => {
    const cache = new PixiTextureCache();
    const url = "/assets/asset_2/content?v=1";

    await cache.load("asset_2", url, "png");
    cache.evict("asset_2");

    expect(unload).toHaveBeenCalledTimes(1);
    expect(unload).toHaveBeenCalledWith(url);
  });

  it("destroys the texture when last retainer leaves and Assets has no entry", async () => {
    cacheHas.mockReturnValue(false);
    const destroy = vi.fn();
    load.mockResolvedValue({ destroy });

    const cache = new PixiTextureCache();
    await cache.load("asset_3", "/assets/asset_3/content", "png");
    cache.evict("asset_3");

    expect(unload).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledWith(true);
  });

  it("keeps a preloaded URL in Assets after the renderer evicts", async () => {
    const cache = new PixiTextureCache();
    const url = "/assets/asset_preload/content?v=1";
    retainPreloadedPixiUrl(url);
    await cache.load("asset_preload", url, "png");
    cache.evictAll();
    expect(unload).not.toHaveBeenCalled();
  });
});
