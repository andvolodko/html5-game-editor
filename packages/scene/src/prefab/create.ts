import { createId } from "@game-editor/shared";
import type { ComponentData, SceneNodeData } from "../types.js";
import { createPrefabInstanceLink } from "./clone.js";
import { cloneJson } from "./property-path.js";
import { PREFAB_SCHEMA_VERSION, type PrefabData } from "./types.js";
import { copyNodeVisible } from "../node-visibility.js";
import { copyNodeAlpha } from "../node-alpha.js";

export interface CreatePrefabFromSubtreeResult {
  prefab: PrefabData;
  instance: SceneNodeData;
}

interface IdMaps {
  node: Map<string, string>;
  component: Map<string, string>;
}

/**
 * Build a prefab document from a scene subtree and convert that subtree
 * into an instance of the new prefab. Scene node IDs are preserved.
 */
export function createPrefabFromSubtree(
  source: SceneNodeData,
  options?: { name?: string; id?: string; prefabAssetId?: string },
): CreatePrefabFromSubtreeResult {
  const maps: IdMaps = { node: new Map(), component: new Map() };
  const prefabRoot = cloneAsPrefabSource(source, undefined, maps, true);
  const prefab: PrefabData = {
    version: PREFAB_SCHEMA_VERSION,
    id: options?.id ?? createId("prefab"),
    name: options?.name ?? source.name,
    root: prefabRoot,
  };
  const prefabAssetId = options?.prefabAssetId ?? createId("asset");
  const instanceId = createId("pinst");
  const instance = convertToInstance(source, {
    prefabAssetId,
    instanceId,
    maps,
    isRoot: true,
    parentId: source.parentId,
  });
  return { prefab, instance };
}

function cloneAsPrefabSource(
  node: SceneNodeData,
  parentId: string | undefined,
  maps: IdMaps,
  stripRootInstance: boolean,
): SceneNodeData {
  const sourceId = createId("node");
  maps.node.set(node.id, sourceId);
  const components = node.components.map((component) => {
    const cloned = cloneJson(component);
    cloned.id = createId("comp");
    maps.component.set(component.id, cloned.id);
    return cloned;
  });
  const cloned: SceneNodeData = {
    id: sourceId,
    name: node.name,
    components,
    children: [],
  };
  if (parentId !== undefined) {
    cloned.parentId = parentId;
  }
  if (node.layer !== undefined) {
    cloned.layer = node.layer;
  }
  copyNodeVisible(node, cloned);
  copyNodeAlpha(node, cloned);
  const keepNestedLink = node.prefab !== undefined && !(stripRootInstance && node.prefab.isRoot);
  if (keepNestedLink && node.prefab) {
    cloned.prefab = remapLinkToNewComponentIds(node.prefab, node.components, cloned.components);
  }
  cloned.children = node.children.map((child) =>
    cloneAsPrefabSource(child, sourceId, maps, false),
  );
  return cloned;
}

function remapLinkToNewComponentIds(
  link: NonNullable<SceneNodeData["prefab"]>,
  previous: readonly ComponentData[],
  next: readonly ComponentData[],
): NonNullable<SceneNodeData["prefab"]> {
  const componentSources: Record<string, string> = {};
  for (let index = 0; index < previous.length; index += 1) {
    const previousComponent = previous[index];
    const nextComponent = next[index];
    if (previousComponent === undefined || nextComponent === undefined) {
      continue;
    }
    componentSources[nextComponent.id] =
      link.componentSources[previousComponent.id] ?? previousComponent.id;
  }
  return {
    ...cloneJson(link),
    componentSources,
  };
}

function convertToInstance(
  node: SceneNodeData,
  context: {
    prefabAssetId: string;
    instanceId: string;
    maps: IdMaps;
    isRoot: boolean;
    parentId?: string;
  },
): SceneNodeData {
  if (node.prefab?.isRoot === true && !context.isRoot) {
    const nested = cloneJson(node);
    if (context.parentId !== undefined) {
      nested.parentId = context.parentId;
    }
    return nested;
  }
  const sourceNodeId = context.maps.node.get(node.id);
  if (sourceNodeId === undefined) {
    return cloneJson(node);
  }
  const componentSources: Record<string, string> = {};
  for (const component of node.components) {
    const sourceComponentId = context.maps.component.get(component.id);
    if (sourceComponentId !== undefined) {
      componentSources[component.id] = sourceComponentId;
    }
  }
  const instance: SceneNodeData = {
    id: node.id,
    name: node.name,
    components: cloneJson(node.components),
    children: [],
    prefab: createPrefabInstanceLink({
      prefabAssetId: context.prefabAssetId,
      instanceId: context.instanceId,
      sourceNodeId,
      componentSources,
      isRoot: context.isRoot,
    }),
  };
  if (node.layer !== undefined) {
    instance.layer = node.layer;
  }
  copyNodeVisible(node, instance);
  copyNodeAlpha(node, instance);
  if (context.parentId !== undefined) {
    instance.parentId = context.parentId;
  }
  instance.children = node.children.map((child) =>
    convertToInstance(child, {
      ...context,
      isRoot: false,
      parentId: instance.id,
    }),
  );
  return instance;
}
