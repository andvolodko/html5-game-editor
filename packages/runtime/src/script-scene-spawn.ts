import type { ScriptSpawnModel3DOptions } from "@game-editor/game-components";
import {
  createModel3DComponent,
  createNodeWithTransform3D,
  detachNodeFromScene,
  findNodeById,
  flattenSubtree,
  getTransform3D,
  insertNodeInScene,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

const DEFAULT_SPAWN_NAME = "Model3D";

export function spawnModel3DInScene(
  scene: SceneData,
  options: ScriptSpawnModel3DOptions,
): SceneNodeData | undefined {
  if (options.assetId.length === 0) {
    return undefined;
  }
  if (
    options.parentId !== undefined &&
    !findNodeById(scene, options.parentId)
  ) {
    return undefined;
  }
  const node = createNodeWithTransform3D(
    options.name ?? DEFAULT_SPAWN_NAME,
    options.position,
    createModel3DComponent({
      assetId: options.assetId,
      loop: false,
      playing: false,
    }),
    options.parentId,
  );
  const transform = getTransform3D(node);
  if (transform) {
    if (options.rotation) {
      transform.rotation = { ...options.rotation };
    }
    if (options.scale) {
      transform.scale = { ...options.scale };
    }
  }
  const siblings =
    options.parentId === undefined
      ? scene.nodes
      : findNodeById(scene, options.parentId)?.children;
  insertNodeInScene(
    scene,
    node,
    options.parentId,
    siblings?.length ?? scene.nodes.length,
  );
  return node;
}

export function destroyNodeInScene(
  scene: SceneData,
  nodeId: string,
): SceneNodeData[] {
  const node = findNodeById(scene, nodeId);
  if (!node) {
    return [];
  }
  const subtree = flattenSubtree(node);
  detachNodeFromScene(scene, nodeId);
  return subtree;
}
