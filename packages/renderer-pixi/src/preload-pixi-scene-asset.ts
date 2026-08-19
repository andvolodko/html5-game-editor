import { Assets } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import { fetchCachedArrayBuffer } from "./cached-asset-fetch.js";
import { loadPixiSpritesheet } from "./load-pixi-spritesheet.js";
import { retainPreloadedPixiUrl } from "./pixi-texture-cache.js";

const TEXTURE_PARSER = "texture";

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

async function loadAndRetainTexture(
  url: string,
  format?: string,
): Promise<void> {
  if (format !== undefined) {
    await Assets.load({
      src: url,
      parser: TEXTURE_PARSER,
      format,
    });
  } else {
    await Assets.load(url);
  }
  retainPreloadedPixiUrl(url);
}

/**
 * Warm Pixi `Assets` (and an in-memory fetch cache for spine JSON/atlas) without
 * attaching to a renderer-owned PixiTextureCache. URLs are pinned so a later
 * renderer destroy/evict does not unload them.
 *
 * glTF ids are skipped — those belong to ThreeGltfCache.
 */
export async function preloadPixiSceneAsset(
  resolver: AssetResolver,
  assetId: string,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  if (resolver.resolveGltfUrls?.(assetId)) {
    return;
  }

  const tileset = resolver.resolveTileSet?.(assetId);
  if (tileset && tileset.imageAssetId !== assetId) {
    await preloadPixiSceneAsset(resolver, tileset.imageAssetId, signal);
    return;
  }

  const spine = resolver.resolveSpineUrls?.(assetId);
  if (spine) {
    await fetchCachedArrayBuffer(spine.atlasUrl, signal);
    await fetchCachedArrayBuffer(spine.skeletonUrl, signal);
    for (const pageUrl of Object.values(spine.pageUrls)) {
      throwIfAborted(signal);
      await loadAndRetainTexture(pageUrl);
    }
    return;
  }

  const aseprite = resolver.resolveAsepriteUrls?.(assetId);
  if (aseprite) {
    await loadPixiSpritesheet(aseprite.jsonUrl);
    retainPreloadedPixiUrl(aseprite.jsonUrl);
    retainPreloadedPixiUrl(aseprite.imageUrl);
    return;
  }

  const font = resolver.resolveBitmapFontUrls?.(assetId);
  if (font) {
    await fetchCachedArrayBuffer(font.xmlUrl, signal);
    for (const pageUrl of Object.values(font.pageUrls)) {
      throwIfAborted(signal);
      await loadAndRetainTexture(pageUrl);
    }
    return;
  }

  const webfont = resolver.resolveWebFontUrls?.(assetId);
  if (webfont) {
    await Assets.load({
      src: webfont.url,
      parser: "web-font",
      data: { family: webfont.fontFamily },
    });
    retainPreloadedPixiUrl(webfont.url);
    return;
  }

  const url = resolver.resolveUrl(assetId);
  if (!url) {
    return;
  }
  const format = resolver.resolveTextureFormat?.(assetId);
  if (format !== undefined) {
    await loadAndRetainTexture(url, format);
    return;
  }
  await fetchCachedArrayBuffer(url, signal);
}
