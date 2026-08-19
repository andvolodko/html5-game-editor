import type { ScriptRuntimeServices } from "@game-editor/game-components";
import {
  getModel3D,
  findNodeById,
  type SceneData,
  type SceneIndex,
} from "@game-editor/scene";

export interface GltfClipLookupHost {
  listNames(assetId: string): readonly string[];
  duration(assetId: string, animation?: string): number | undefined;
}

/**
 * Node-id clip lookups for ScriptRuntimeServices, backed by a glTF cache
 * (or any host that can list clip names / durations by assetId).
 */
export function createGltfClipScriptLookups(
  getScene: () => SceneData | undefined,
  host: GltfClipLookupHost,
  getIndex?: () => SceneIndex | undefined,
): Pick<
  ScriptRuntimeServices,
  "listModel3DAnimations" | "getModel3DAnimationDuration"
> {
  const assetIdOf = (nodeId: string): string | undefined => {
    const index = getIndex?.();
    if (index) {
      const indexed = index.getNode(nodeId);
      return indexed ? getModel3D(indexed)?.assetId : undefined;
    }
    const scene = getScene();
    const node = scene ? findNodeById(scene, nodeId) : undefined;
    return node ? getModel3D(node)?.assetId : undefined;
  };
  return {
    listModel3DAnimations: (nodeId) => {
      const assetId = assetIdOf(nodeId);
      if (!assetId) {
        return [];
      }
      return host.listNames(assetId);
    },
    getModel3DAnimationDuration: (nodeId, animation) => {
      const assetId = assetIdOf(nodeId);
      if (!assetId) {
        return undefined;
      }
      return host.duration(assetId, animation);
    },
  };
}
