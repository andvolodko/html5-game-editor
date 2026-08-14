import { Assets } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import { loadPixiSpritesheet } from "./load-pixi-spritesheet.js";

const TEXTURE_PARSER = "texture";

async function downloadBody(url: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  await response.arrayBuffer();
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

/**
 * Warm Pixi `Assets` (and HTTP cache for spine JSON/atlas) without attaching
 * to a renderer-owned PixiTextureCache. Scene-change destroy/evict then still
 * hits Assets on the next paint.
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

  const spine = resolver.resolveSpineUrls?.(assetId);
  if (spine) {
    await downloadBody(spine.atlasUrl, signal);
    await downloadBody(spine.skeletonUrl, signal);
    for (const pageUrl of Object.values(spine.pageUrls)) {
      throwIfAborted(signal);
      await Assets.load(pageUrl);
    }
    return;
  }

  const aseprite = resolver.resolveAsepriteUrls?.(assetId);
  if (aseprite) {
    await loadPixiSpritesheet(aseprite.jsonUrl);
    return;
  }

  const font = resolver.resolveBitmapFontUrls?.(assetId);
  if (font) {
    await downloadBody(font.xmlUrl, signal);
    for (const pageUrl of Object.values(font.pageUrls)) {
      throwIfAborted(signal);
      await Assets.load(pageUrl);
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
    return;
  }

  const url = resolver.resolveUrl(assetId);
  if (!url) {
    return;
  }
  const format = resolver.resolveTextureFormat?.(assetId);
  if (format !== undefined) {
    await Assets.load({
      src: url,
      parser: TEXTURE_PARSER,
      format,
    });
    return;
  }
  await downloadBody(url, signal);
}
