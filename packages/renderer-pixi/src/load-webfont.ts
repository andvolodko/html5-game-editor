import { Assets } from "pixi.js";
import type { WebFontAssetUrls } from "@game-editor/assets";

const WEB_FONT_PARSER = "web-font";
const loaded = new Map<string, Promise<string>>();

/**
 * Registers a TTF/OTF/WOFF into `document.fonts` via Pixi's web-font parser.
 * Always pass `parser` + `family` — editor content URLs have no extension,
 * and Pixi's filename inference title-cases families (ChaChicle → Chachicle).
 */
export async function loadWebFont(
  assetId: string,
  urls: WebFontAssetUrls,
): Promise<string> {
  const existing = loaded.get(assetId);
  if (existing) {
    return existing;
  }
  const pending = Assets.load({
    src: urls.url,
    parser: WEB_FONT_PARSER,
    data: { family: urls.fontFamily },
  }).then(() => urls.fontFamily);
  loaded.set(assetId, pending);
  try {
    return await pending;
  } catch (error) {
    loaded.delete(assetId);
    throw error;
  }
}
