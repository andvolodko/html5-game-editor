import { createId } from "@game-editor/shared";
import type { SceneNodeData, Vec2, Vec3 } from "../types.js";
import { getTransform2D, getTransform3D } from "../queries.js";
import { cloneComponentWithNewId, createPrefabInstanceLink } from "./clone.js";
import { applyOverridesToInstance, computePrefabOverrides } from "./overrides.js";
import { cloneJson } from "./property-path.js";
import type { PrefabData, PrefabOverride } from "./types.js";
import { copyNodeVisible } from "../node-visibility.js";
import { copyNodeAlpha } from "../node-alpha.js";
import { copyNodePointer } from "../node-pointer.js";
import { copyNodeStateOverrides } from "../node-states/index.js";

export interface InstantiatePrefabOptions {
  prefabAssetId: string;
  parentId?: string;
  instanceId?: string;
  overrides?: readonly PrefabOverride[];
  position2D?: Vec2;
  position3D?: Vec3;
}

export interface InstantiatePrefabResult {
  node: SceneNodeData;
  instanceId: string;
}

/**
 * Instantiate a prefab source tree into a scene subtree with unique scene IDs.
 * Nested prefab instances already present on the source are remapped, not re-expanded.
 */
export function instantiatePrefab(
  prefab: PrefabData,
  options: InstantiatePrefabOptions,
): InstantiatePrefabResult {
  const instanceId = options.instanceId ?? createId("pinst");
  const sourceRoot = cloneJson(prefab.root);
  const node = instantiateFromSource(sourceRoot, {
    prefabAssetId: options.prefabAssetId,
    instanceId,
    parentId: options.parentId,
    isRoot: true,
  });
  const overrides = options.overrides ? [...options.overrides] : [];
  applyPlacementOverrides(node, sourceRoot, overrides, options);
  if (overrides.length > 0) {
    applyOverridesToInstance(node, sourceRoot, overrides);
  }
  if (node.prefab) {
    node.prefab.overrides = overrides.length > 0 ? cloneJson(overrides) : undefined;
  }
  return { node, instanceId };
}

export function instantiateFromSource(
  source: SceneNodeData,
  context: {
    prefabAssetId: string;
    instanceId: string;
    parentId?: string;
    isRoot: boolean;
  },
): SceneNodeData {
  const componentSources: Record<string, string> = {};
  const components = source.components.map((component) => {
    const cloned = cloneComponentWithNewId(component);
    componentSources[cloned.id] = component.id;
    return cloned;
  });
  const node: SceneNodeData = {
    id: createId("node"),
    name: source.name,
    components,
    children: [],
    prefab: createPrefabInstanceLink({
      prefabAssetId: context.prefabAssetId,
      instanceId: context.instanceId,
      sourceNodeId: source.id,
      componentSources,
      isRoot: context.isRoot,
    }),
  };
  if (source.layer !== undefined) {
    node.layer = source.layer;
  }
  copyNodeVisible(source, node);
  copyNodeAlpha(source, node);
  copyNodePointer(source, node);
  copyNodeStateOverrides(source, node);
  if (context.parentId !== undefined) {
    node.parentId = context.parentId;
  }
  node.children = source.children.map((child) => {
    if (child.prefab?.isRoot === true) {
      return remapNestedInstance(child, node.id);
    }
    return instantiateFromSource(child, {
      prefabAssetId: context.prefabAssetId,
      instanceId: context.instanceId,
      parentId: node.id,
      isRoot: false,
    });
  });
  return node;
}

function remapNestedInstance(source: SceneNodeData, parentId: string): SceneNodeData {
  const nestedInstanceId = createId("pinst");
  const remapInstance = (node: SceneNodeData, nextParentId: string | undefined): SceneNodeData => {
    const componentSources: Record<string, string> = {};
    const components = node.components.map((component) => {
      const cloned = cloneComponentWithNewId(component);
      const sourceId = node.prefab?.componentSources[component.id] ?? component.id;
      componentSources[cloned.id] = sourceId;
      return cloned;
    });
    const cloned: SceneNodeData = {
      id: createId("node"),
      name: node.name,
      components,
      children: [],
    };
    if (node.layer !== undefined) {
      cloned.layer = node.layer;
    }
    copyNodeVisible(node, cloned);
    copyNodeAlpha(node, cloned);
    copyNodePointer(node, cloned);
    copyNodeStateOverrides(node, cloned);
    if (nextParentId !== undefined) {
      cloned.parentId = nextParentId;
    }
    if (node.prefab) {
      cloned.prefab = {
        ...cloneJson(node.prefab),
        instanceId: nestedInstanceId,
        componentSources,
      };
    }
    cloned.children = node.children.map((child) => remapInstance(child, cloned.id));
    return cloned;
  };
  return remapInstance(source, parentId);
}

function applyPlacementOverrides(
  instanceRoot: SceneNodeData,
  sourceRoot: SceneNodeData,
  overrides: PrefabOverride[],
  options: InstantiatePrefabOptions,
): void {
  if (options.position2D) {
    const transform = getTransform2D(instanceRoot);
    if (transform) {
      transform.position = { ...options.position2D };
      overrides.splice(0, overrides.length, ...computePrefabOverrides(sourceRoot, instanceRoot));
    }
  }
  if (options.position3D) {
    const transform = getTransform3D(instanceRoot);
    if (transform) {
      transform.position = { ...options.position3D };
      overrides.splice(0, overrides.length, ...computePrefabOverrides(sourceRoot, instanceRoot));
    }
  }
}
