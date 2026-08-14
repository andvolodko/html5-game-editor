import type { AssetResolver } from "@game-editor/assets";
import type { TextStyleData } from "@game-editor/scene";
import { loadWebFont } from "../load-webfont.js";

/**
 * Loads `style.fontAssetId` when set and returns a style whose `fontFamily`
 * matches the catalogue webfont. System fonts pass through unchanged.
 */
export async function resolveTextStyleWithWebFont(
  style: TextStyleData,
  resolver: AssetResolver | undefined,
  warnMissingAsset: (assetId: string) => void,
): Promise<TextStyleData> {
  if (!style.fontAssetId) {
    return style;
  }
  const urls = resolver?.resolveWebFontUrls?.(style.fontAssetId);
  if (!urls) {
    warnMissingAsset(style.fontAssetId);
    return style;
  }
  const fontFamily = await loadWebFont(style.fontAssetId, urls);
  if (fontFamily === style.fontFamily) {
    return style;
  }
  return { ...style, fontFamily };
}
