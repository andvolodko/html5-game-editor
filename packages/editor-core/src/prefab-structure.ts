import { DomainError } from "@game-editor/core";
import {
  findNodeById,
  isInheritedPrefabNode,
  type SceneData,
} from "@game-editor/scene";

export const PREFAB_INHERITED_LOCKED_CODE = "PREFAB_INHERITED_LOCKED";

export const PREFAB_INHERITED_LOCKED_MESSAGE =
  "Inherited prefab nodes cannot be deleted, duplicated, or reparented. Unpack the instance first, or add a local child instead.";

export function assertPrefabStructureEditAllowed(
  scene: SceneData,
  nodeId: string,
): void {
  const node = findNodeById(scene, nodeId);
  if (node && isInheritedPrefabNode(node)) {
    throw new DomainError(PREFAB_INHERITED_LOCKED_CODE, PREFAB_INHERITED_LOCKED_MESSAGE);
  }
}

export function isPrefabStructureEditAllowed(
  scene: SceneData,
  nodeId: string,
): boolean {
  const node = findNodeById(scene, nodeId);
  return !node || !isInheritedPrefabNode(node);
}
