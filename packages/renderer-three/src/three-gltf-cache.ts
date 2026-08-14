import type { AssetResolver } from "@game-editor/assets";
import { type AnimationClip, type Object3D } from "three";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";
import { loadGltf, type LoadedGltf } from "./load-gltf.js";

const PLACEHOLDER_NAME = "__model3d_placeholder";

export type CachedGltfAsset = LoadedGltf;

/**
 * Loads and caches glTF scenes by assetId.
 * Multi-file .gltf parts are rewritten to project-server part URLs.
 * Instances use SkeletonUtils.clone so SkinnedMesh bones stay valid.
 */
export class ThreeGltfCache {
  private readonly cache = new Map<string, CachedGltfAsset>();
  private readonly inflight = new Map<string, Promise<CachedGltfAsset | undefined>>();
  private resolver: AssetResolver | undefined;
  private onLoadError: ((assetId: string, error: unknown) => void) | undefined;

  setResolver(resolver: AssetResolver | undefined): void {
    this.resolver = resolver;
  }

  setLoadErrorHandler(
    handler: ((assetId: string, error: unknown) => void) | undefined,
  ): void {
    this.onLoadError = handler;
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  invalidate(assetId: string): void {
    this.cache.delete(assetId);
    this.inflight.delete(assetId);
  }

  getCached(assetId: string): CachedGltfAsset | undefined {
    return this.cache.get(assetId);
  }

  listAnimationNames(assetId: string): string[] {
    return (this.cache.get(assetId)?.animations ?? []).map((clip) => clip.name);
  }

  /**
   * Clone a skinned-mesh-safe instance of the cached scene.
   * Returns undefined if not loaded.
   */
  createInstance(assetId: string): Object3D | undefined {
    const cached = this.cache.get(assetId);
    if (!cached) {
      return undefined;
    }
    return skeletonClone(cached.scene);
  }

  getClips(assetId: string): AnimationClip[] {
    return this.cache.get(assetId)?.animations ?? [];
  }

  async ensureLoaded(assetId: string): Promise<CachedGltfAsset | undefined> {
    const cached = this.cache.get(assetId);
    if (cached) {
      return cached;
    }
    const pending = this.inflight.get(assetId);
    if (pending) {
      return pending;
    }

    const gltfUrls = this.resolver?.resolveGltfUrls?.(assetId);
    const rootUrl = gltfUrls?.rootUrl ?? this.resolver?.resolveUrl(assetId);
    if (!rootUrl) {
      return undefined;
    }

    const partUrls = gltfUrls?.partUrls ?? {};
    const loadPromise = loadGltf({
      rootUrl,
      format: gltfUrls?.format ?? "glb",
      partUrls,
    })
      .then((gltf) => {
        this.cache.set(assetId, gltf);
        this.inflight.delete(assetId);
        return gltf;
      })
      .catch((error: unknown) => {
        this.inflight.delete(assetId);
        this.onLoadError?.(assetId, error);
        return undefined;
      });
    this.inflight.set(assetId, loadPromise);
    return loadPromise;
  }
}

export function isPlaceholderObject(object: Object3D): boolean {
  return object.name === PLACEHOLDER_NAME;
}

export function markPlaceholder(object: Object3D): void {
  object.name = PLACEHOLDER_NAME;
}
