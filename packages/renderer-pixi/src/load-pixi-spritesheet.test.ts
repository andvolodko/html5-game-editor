import { beforeEach, describe, expect, it, vi } from "vitest";

const load = vi.fn(async () => ({ textures: {}, animations: {} }));
const unload = vi.fn(async () => undefined);
const cacheHas = vi.fn(() => false);

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
  loadPixiSpritesheet,
  pixiSpritesheetCachePrefix,
  resetPixiSpritesheetCacheForTests,
} from "./load-pixi-spritesheet.js";

function fakeSheet(): { textures: object; animations: object } {
  return { textures: {}, animations: {} };
}

describe("loadPixiSpritesheet", () => {
  beforeEach(() => {
    resetPixiSpritesheetCacheForTests();
    load.mockClear();
    load.mockImplementation(async () => fakeSheet());
  });

  it("loads through Pixi Assets with a URL-scoped cache prefix", async () => {
    const url = "/assets/asset_1/part/hero.json?v=1";
    await loadPixiSpritesheet(url);
    expect(load).toHaveBeenCalledWith({
      src: url,
      data: { cachePrefix: pixiSpritesheetCachePrefix(url) },
    });
  });

  it("reuses one in-flight load when preview and scene request the same URL", async () => {
    let resolveLoad: ((value: ReturnType<typeof fakeSheet>) => void) | undefined;
    load.mockImplementation(
      async () =>
        await new Promise<ReturnType<typeof fakeSheet>>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const url = "/assets/asset_1/part/hero.json?v=2";
    const first = loadPixiSpritesheet(url);
    const second = loadPixiSpritesheet(url);
    resolveLoad?.(fakeSheet());
    await Promise.all([first, second]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
