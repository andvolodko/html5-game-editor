import { Assets, BitmapFont, Cache } from "pixi.js";
import type { Texture } from "pixi.js";
import type { BitmapFontAssetUrls } from "@game-editor/assets";
import { fetchCachedText } from "./cached-asset-fetch.js";
import { parseBitmapFontXml } from "./parse-bitmap-font-xml.js";

const loaded = new Map<string, Promise<string>>();

function cacheKey(fontFamily: string): string {
  return `${fontFamily}-bitmap`;
}

function pageUrl(
  urls: BitmapFontAssetUrls,
  fileName: string,
): string | undefined {
  return (
    urls.pageUrls[fileName] ??
    Object.entries(urls.pageUrls).find(
      ([name]) => name.toLowerCase() === fileName.toLowerCase(),
    )?.[1]
  );
}

/**
 * Installs a BMFont into Pixi's BitmapText cache from resolved URLs.
 * Does not use `Assets.load(xmlUrl)` — editor content URLs have no extension,
 * so relative page files would not resolve.
 */
export async function loadBitmapFont(
  assetId: string,
  urls: BitmapFontAssetUrls,
): Promise<string> {
  const existing = loaded.get(assetId);
  if (existing) {
    return existing;
  }
  const pending = installBitmapFont(urls);
  loaded.set(assetId, pending);
  try {
    return await pending;
  } catch (error) {
    loaded.delete(assetId);
    throw error;
  }
}

async function installBitmapFont(urls: BitmapFontAssetUrls): Promise<string> {
  if (Cache.has(cacheKey(urls.fontFamily))) {
    return urls.fontFamily;
  }

  const xmlText = await fetchCachedText(urls.xmlUrl);
  const data = parseBitmapFontXml(xmlText);
  const textures: Texture[] = [];
  for (const page of data.pages) {
    const url = pageUrl(urls, page.file);
    if (!url) {
      throw new Error(`Missing bitmap font page: ${page.file}`);
    }
    textures[page.id] = (await Assets.load(url)) as Texture;
  }

  const font = new BitmapFont(
    { data, textures },
    urls.xmlUrl,
  );
  Cache.set(cacheKey(data.fontFamily), font);
  return data.fontFamily;
}
