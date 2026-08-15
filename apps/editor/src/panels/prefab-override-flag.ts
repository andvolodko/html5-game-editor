import {
  findPrefabInstanceRoot,
  isPropertyOverridden,
  sourceComponentIdFor,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

export function isInspectorPropertyOverridden(
  scene: SceneData,
  node: SceneNodeData,
  sceneComponentId: string,
  propertyPath: string,
): boolean {
  if (node.prefab === undefined) {
    return false;
  }
  const root = findPrefabInstanceRoot(scene, node.id);
  const sourceComponentId = sourceComponentIdFor(node, sceneComponentId);
  if (!root || sourceComponentId === undefined) {
    return false;
  }
  return isPropertyOverridden(
    root,
    node.prefab.sourceNodeId,
    sourceComponentId,
    propertyPath,
  );
}
