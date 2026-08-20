import type { AssetDatabase } from "./asset-database.js";
import type {
  AsepriteAssetUrls,
  AssetResolver,
  BitmapFontAssetUrls,
  GltfAssetUrls,
  SpineAssetUrls,
  TileSetResolved,
  WebFontAssetUrls,
} from "./asset-resolver.js";
import {
  getFileBasename,
  textureFormatFromMimeType,
} from "./texture-extensions.js";
import { resolveGltfPartRelativePath } from "./gltf-extensions.js";
import { resolveSpinePartRelativePath } from "./spine-extensions.js";
import {
  resolveAsepritePartRelativePath,
  toPublicAssetPath,
} from "./aseprite-extensions.js";
import { resolveBitmapFontPartRelativePath } from "./bitmap-font-extensions.js";
import { normalizeProjectRelativePath } from "./factories.js";
import { tileSetResolvedFromMetadata } from "./tileset.js";

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
    const normalized = toPublicAssetPath(
      normalizeProjectRelativePath(projectPath),
    );
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

    resolveGltfPartUrl(assetId: string, part: string): string | undefined {
      const asset = database.get(assetId);
      if (!asset) {
        return undefined;
      }
      const partPath = resolveGltfPartRelativePath(asset, part);
      return partPath === undefined ? undefined : toUrl(partPath);
    },

    resolveGltfUrls(assetId: string): GltfAssetUrls | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "gltf") {
        return undefined;
      }
      const partUrls: Record<string, string> = {};
      const owned = [
        ...(asset.metadata.bufferPaths ?? []),
        ...(asset.metadata.imagePaths ?? []),
      ];
      for (const partPath of owned) {
        partUrls[getFileBasename(partPath)] = toUrl(partPath);
      }
      return {
        rootUrl: toUrl(asset.path),
        format: asset.metadata.format,
        partUrls,
      };
    },

    resolveAsepritePartUrl(assetId: string, part: string): string | undefined {
      const asset = database.get(assetId);
      if (!asset) {
        return undefined;
      }
      const partPath = resolveAsepritePartRelativePath(asset, part);
      return partPath === undefined ? undefined : toUrl(partPath);
    },

    resolveAsepriteUrls(assetId: string): AsepriteAssetUrls | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "aseprite") {
        return undefined;
      }
      return {
        jsonUrl: toUrl(asset.metadata.dataPath),
        imageUrl: toUrl(asset.metadata.sheetPath),
        tags: asset.metadata.tags.map((tag) => tag.name),
        frameDurations: asset.metadata.frameDurations,
        frameCount: asset.metadata.frameCount,
      };
    },

    resolveBitmapFontPartUrl(assetId: string, part: string): string | undefined {
      const asset = database.get(assetId);
      if (!asset) {
        return undefined;
      }
      const partPath = resolveBitmapFontPartRelativePath(asset, part);
      return partPath === undefined ? undefined : toUrl(partPath);
    },

    resolveBitmapFontUrls(assetId: string): BitmapFontAssetUrls | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "font") {
        return undefined;
      }
      const pageUrls: Record<string, string> = {};
      for (const pagePath of asset.metadata.pagePaths) {
        pageUrls[getFileBasename(pagePath)] = toUrl(pagePath);
      }
      return {
        xmlUrl: toUrl(asset.path),
        fontFamily: asset.metadata.fontFamily,
        pageUrls,
      };
    },

    resolveWebFontUrls(assetId: string): WebFontAssetUrls | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "webfont") {
        return undefined;
      }
      return {
        url: toUrl(asset.path),
        fontFamily: asset.metadata.fontFamily,
        format: asset.metadata.format,
      };
    },

    resolveTileSet(assetId: string): TileSetResolved | undefined {
      const asset = database.get(assetId);
      if (!asset || asset.metadata.kind !== "tileset") {
        return undefined;
      }
      return tileSetResolvedFromMetadata(asset.metadata);
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl === "" || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
