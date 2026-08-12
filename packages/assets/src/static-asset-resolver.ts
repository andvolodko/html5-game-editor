import type { AssetDatabase } from "./asset-database.js";
import type { AssetResolver, SpineAssetUrls } from "./asset-resolver.js";
import {
  getFileBasename,
  textureFormatFromMimeType,
} from "./texture-extensions.js";
import { resolveSpinePartRelativePath } from "./spine-extensions.js";
import { normalizeProjectRelativePath } from "./factories.js";

export interface StaticAssetResolverOptions {
  /**
   * URL prefix for project-relative paths (default "/").
   * Example: "/" → "assets/ui/hero.png" becomes "/assets/ui/hero.png".
   */
  baseUrl?: string;
}

/**
 * Resolves assetIds to static project-relative URLs for game builds.
 * Paths come from AssetDatabase; no project-server HTTP API required.
 */
export function createStaticAssetResolver(
  database: AssetDatabase,
  options: StaticAssetResolverOptions = {},
): AssetResolver {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "/");

  const toUrl = (projectPath: string): string => {
    const normalized = normalizeProjectRelativePath(projectPath);
    return `${baseUrl}${normalized}`;
  };

  return {
    resolveUrl(assetId: string): string | undefined {
      const path = database.resolvePath(assetId);
      return path === undefined ? undefined : toUrl(path);
    },

    resolveTextureFormat(assetId: string): string | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "texture") {
        return undefined;
      }
      return textureFormatFromMimeType(asset.metadata.mimeType);
    },

    resolveSpinePartUrl(assetId: string, part: string): string | undefined {
      const asset = database.get(assetId);
      if (!asset) {
        return undefined;
      }
      const partPath = resolveSpinePartRelativePath(asset, part);
      return partPath === undefined ? undefined : toUrl(partPath);
    },

    resolveSpineUrls(assetId: string): SpineAssetUrls | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "spine") {
        return undefined;
      }
      const skeletonUrl = toUrl(asset.path);
      const atlasUrl = toUrl(asset.metadata.atlasPath);
      const pageUrls: Record<string, string> = {};
      for (const pagePath of asset.metadata.pagePaths) {
        pageUrls[getFileBasename(pagePath)] = toUrl(pagePath);
      }
      return {
        skeletonUrl,
        skeletonFormat: asset.metadata.skeletonFormat,
        atlasUrl,
        pageUrls,
      };
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl === "" || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
