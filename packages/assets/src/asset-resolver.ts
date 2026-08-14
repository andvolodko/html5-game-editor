/**
 * Renderer/runtime port: resolve a stable assetId to a loadable URL.
 * Editor supplies project-server HTTP URLs; games may supply bundled asset URLs.
 * Never put filesystem paths from the browser into this interface.
 */
export interface AssetResolver {
  resolveUrl(assetId: string): string | undefined;
  /**
   * Optional Pixi (etc.) format hint when the URL has no file extension.
   * Returns values like `"png"`, `"jpg"`, `"webp"`.
   */
  resolveTextureFormat?(assetId: string): string | undefined;
  /** Atlas / page bytes for a spine bundle, keyed by allowlisted basename. */
  resolveSpinePartUrl?(assetId: string, part: string): string | undefined;
  /** Resolved URLs for a spine bundle (skeleton + atlas + pages). */
  resolveSpineUrls?(assetId: string): SpineAssetUrls | undefined;
  /** Buffer / image bytes for a multi-file glTF bundle. */
  resolveGltfPartUrl?(assetId: string, part: string): string | undefined;
  /** Root + part map for GLTFLoader URL rewriting. */
  resolveGltfUrls?(assetId: string): GltfAssetUrls | undefined;
  /** Generated spritesheet JSON / PNG for an Aseprite source asset. */
  resolveAsepritePartUrl?(assetId: string, part: string): string | undefined;
  resolveAsepriteUrls?(assetId: string): AsepriteAssetUrls | undefined;
  /** Page textures for a bitmap-font bundle, keyed by allowlisted basename. */
  resolveBitmapFontPartUrl?(assetId: string, part: string): string | undefined;
  /** Descriptor + page URLs for a bitmap font (AngelCode XML/FNT). */
  resolveBitmapFontUrls?(assetId: string): BitmapFontAssetUrls | undefined;
  /** File URL + CSS family for a TTF/OTF/WOFF catalogue asset. */
  resolveWebFontUrls?(assetId: string): WebFontAssetUrls | undefined;
}

export interface SpineAssetUrls {
  skeletonUrl: string;
  skeletonFormat: "json" | "skel";
  atlasUrl: string;
  /** Atlas page basename → fetch URL. */
  pageUrls: Readonly<Record<string, string>>;
}

export interface GltfAssetUrls {
  rootUrl: string;
  format: "glb" | "gltf";
  /** Basename → fetch URL for buffers/images. */
  partUrls: Readonly<Record<string, string>>;
}

export interface AsepriteAssetUrls {
  jsonUrl: string;
  imageUrl: string;
  tags: readonly string[];
  frameDurations: readonly number[];
  frameCount: number;
}

export interface BitmapFontAssetUrls {
  xmlUrl: string;
  fontFamily: string;
  /** Page basename → fetch URL. */
  pageUrls: Readonly<Record<string, string>>;
}

export interface WebFontAssetUrls {
  url: string;
  fontFamily: string;
  format: "ttf" | "otf" | "woff" | "woff2";
}

/** Adapts a plain function to AssetResolver. */
export function createAssetResolver(
  resolveUrl: (assetId: string) => string | undefined,
  resolveTextureFormat?: (assetId: string) => string | undefined,
  resolveSpinePartUrl?: (assetId: string, part: string) => string | undefined,
  resolveSpineUrls?: (assetId: string) => SpineAssetUrls | undefined,
  resolveGltfPartUrl?: (assetId: string, part: string) => string | undefined,
  resolveGltfUrls?: (assetId: string) => GltfAssetUrls | undefined,
  resolveAsepritePartUrl?: (assetId: string, part: string) => string | undefined,
  resolveAsepriteUrls?: (assetId: string) => AsepriteAssetUrls | undefined,
  resolveBitmapFontPartUrl?: (
    assetId: string,
    part: string,
  ) => string | undefined,
  resolveBitmapFontUrls?: (assetId: string) => BitmapFontAssetUrls | undefined,
  resolveWebFontUrls?: (assetId: string) => WebFontAssetUrls | undefined,
): AssetResolver {
  return {
    resolveUrl,
    ...(resolveTextureFormat !== undefined ? { resolveTextureFormat } : {}),
    ...(resolveSpinePartUrl !== undefined ? { resolveSpinePartUrl } : {}),
    ...(resolveSpineUrls !== undefined ? { resolveSpineUrls } : {}),
    ...(resolveGltfPartUrl !== undefined ? { resolveGltfPartUrl } : {}),
    ...(resolveGltfUrls !== undefined ? { resolveGltfUrls } : {}),
    ...(resolveAsepritePartUrl !== undefined ? { resolveAsepritePartUrl } : {}),
    ...(resolveAsepriteUrls !== undefined ? { resolveAsepriteUrls } : {}),
    ...(resolveBitmapFontPartUrl !== undefined
      ? { resolveBitmapFontPartUrl }
      : {}),
    ...(resolveBitmapFontUrls !== undefined ? { resolveBitmapFontUrls } : {}),
    ...(resolveWebFontUrls !== undefined ? { resolveWebFontUrls } : {}),
  };
}
