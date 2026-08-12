import type { AssetResolver } from "@game-editor/assets";
import { collectReferencedAssetIds, type SceneData } from "@game-editor/scene";

function addUrl(urls: Set<string>, value: string | undefined): void {
  if (value !== undefined && value.length > 0) {
    urls.add(value);
  }
}

function addAssetUrls(
  urls: Set<string>,
  resolver: AssetResolver,
  assetId: string,
): void {
  const gltf = resolver.resolveGltfUrls?.(assetId);
  if (gltf) {
    addUrl(urls, gltf.rootUrl);
    for (const partUrl of Object.values(gltf.partUrls)) {
      addUrl(urls, partUrl);
    }
    return;
  }

  const spine = resolver.resolveSpineUrls?.(assetId);
  if (spine) {
    addUrl(urls, spine.skeletonUrl);
    addUrl(urls, spine.atlasUrl);
    for (const pageUrl of Object.values(spine.pageUrls)) {
      addUrl(urls, pageUrl);
    }
    return;
  }

  addUrl(urls, resolver.resolveUrl(assetId));
}

/** Unique catalogue assetIds referenced by any of the scenes. */
export function collectSceneAssetIds(scenes: Iterable<SceneData>): string[] {
  const assetIds = new Set<string>();
  for (const scene of scenes) {
    for (const assetId of collectReferencedAssetIds(scene)) {
      assetIds.add(assetId);
    }
  }
  return [...assetIds].sort();
}

/**
 * Unique fetchable URLs for every catalogue asset referenced by the scenes.
 * Expands spine / glTF bundles to their part files.
 */
export function collectSceneAssetUrls(
  scenes: Iterable<SceneData>,
  resolver: AssetResolver,
): string[] {
  const urls = new Set<string>();
  for (const assetId of collectSceneAssetIds(scenes)) {
    addAssetUrls(urls, resolver, assetId);
  }
  return [...urls].sort();
}
