import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchCachedArrayBuffer,
  fetchCachedJson,
  fetchCachedText,
  resetCachedAssetFetchForTests,
} from "./cached-asset-fetch.js";

describe("cached-asset-fetch", () => {
  afterEach(() => {
    resetCachedAssetFetchForTests();
    vi.unstubAllGlobals();
  });

  it("fetches a URL once and reuses the body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("hello").buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchCachedText("/a.txt");
    const second = await fetchCachedText("/a.txt");
    expect(first).toBe("hello");
    expect(second).toBe("hello");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses JSON from the cached body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('{"ok":true}').buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCachedJson("/data.json")).resolves.toEqual({ ok: true });
    await fetchCachedArrayBuffer("/data.json");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
