import type { GltfAssetUrls } from "@game-editor/assets";
import { type AnimationClip, type Group, LoadingManager } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface LoadedGltf {
  scene: Group;
  animations: AnimationClip[];
}

/**
 * Load a glTF / GLB from resolved URLs.
 * Multi-file `.gltf` buffers and images are rewritten via `partUrls`.
 */
export async function loadGltf(urls: GltfAssetUrls): Promise<LoadedGltf> {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    const base = url.split(/[\\/]/).pop() ?? url;
    const mapped = urls.partUrls[base] ?? urls.partUrls[base.toLowerCase()];
    return mapped ?? url;
  });
  const loader = new GLTFLoader(manager);
  const gltf = await loader.loadAsync(urls.rootUrl);
  return {
    scene: gltf.scene,
    animations: gltf.animations.slice(),
  };
}
