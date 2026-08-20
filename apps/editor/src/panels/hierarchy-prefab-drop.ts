import {
  findNodeById,
  nodeCanHaveChildren,
  type SceneData,
} from "@game-editor/scene";

export function resolvePrefabDropParent(
  scene: SceneData,
  targetId: string | undefined,
): string | undefined {
  if (targetId === undefined) {
    return undefined;
  }
  const node = findNodeById(scene, targetId);
  if (!node) {
    return undefined;
  }
  if (nodeCanHaveChildren(node)) {
    return node.id;
  }
  return node.parentId;
}
