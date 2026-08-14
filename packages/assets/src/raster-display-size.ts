import type { AssetRecord } from "./types.js";

/** Native display size for textures and Aseprite cels (not atlas / sheet size). */
export function rasterAssetDisplaySize(
  asset: AssetRecord,
): { width: number; height: number } | undefined {
  if (asset.metadata.kind === "texture" || asset.metadata.kind === "aseprite") {
    return { width: asset.metadata.width, height: asset.metadata.height };
  }
  return undefined;
}
