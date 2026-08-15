import { createId } from "@game-editor/shared";
import type { ComponentData, SceneNodeData } from "../types.js";
import { cloneJson } from "./property-path.js";
import type { PrefabInstanceLink } from "./types.js";

export function cloneSerializableNode(source: SceneNodeData): SceneNodeData {
  const cloned: SceneNodeData = {
    id: source.id,
    name: source.name,
    components: cloneJson(source.components),
    children: source.children.map((child) => cloneSerializableNode(child)),
  };
  if (source.parentId !== undefined) {
    cloned.parentId = source.parentId;
  }
  if (source.layer !== undefined) {
    cloned.layer = source.layer;
  }
  if (source.prefab !== undefined) {
    cloned.prefab = cloneJson(source.prefab);
  }
  return cloned;
}

export function remintPrefabInstanceIds(root: SceneNodeData): void {
  const remapped = new Map<string, string>();
  const visit = (node: SceneNodeData): void => {
    if (node.prefab) {
      let nextId = remapped.get(node.prefab.instanceId);
      if (nextId === undefined) {
        nextId = createId("pinst");
        remapped.set(node.prefab.instanceId, nextId);
      }
      node.prefab = { ...node.prefab, instanceId: nextId };
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
}

export function cloneComponentWithNewId(component: ComponentData): ComponentData {
  const copy = cloneJson(component);
  copy.id = createId("comp");
  return copy;
}

export function createPrefabInstanceLink(input: {
  prefabAssetId: string;
  instanceId: string;
  sourceNodeId: string;
  componentSources: Record<string, string>;
  isRoot?: boolean;
}): PrefabInstanceLink {
  const link: PrefabInstanceLink = {
    prefabAssetId: input.prefabAssetId,
    instanceId: input.instanceId,
    sourceNodeId: input.sourceNodeId,
    componentSources: { ...input.componentSources },
  };
  if (input.isRoot === true) {
    link.isRoot = true;
  }
  return link;
}
