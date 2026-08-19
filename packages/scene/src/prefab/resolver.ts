import { createId } from "@game-editor/shared";
import type { ComponentData, SceneData, SceneNodeData } from "../types.js";
import { cloneComponentWithNewId, createPrefabInstanceLink } from "./clone.js";
import { instantiateFromSource, instantiatePrefab } from "./instantiate.js";
import {
  applyOverridesToInstance,
  findPrefabSourceNode,
} from "./overrides.js";
import { cloneJson, setValueAtPath } from "./property-path.js";
import { isPrefabInstanceRoot } from "./queries.js";
import { expandPrefabSourceTree } from "./resolver-expand.js";
import type {
  PrefabCatalog,
  PrefabData,
  PrefabOverride,
  PrefabResolveResult,
  PrefabResolveWarning,
} from "./types.js";
import { getNodeVisible, setNodeVisibleField } from "../node-visibility.js";
import { getNodeAlpha, setNodeAlphaField } from "../node-alpha.js";
import {
  getNodeCursor,
  getNodePointerChildren,
  getNodePointerEventMode,
  setNodeCursorField,
  setNodePointerChildrenField,
  setNodePointerEventModeField,
} from "../node-pointer.js";

export function resolvePrefabInstance(
  prefab: PrefabData,
  instance: SceneNodeData,
  catalog: PrefabCatalog = new Map(),
): PrefabResolveResult {
  const warnings: PrefabResolveWarning[] = [];
  const assetId = instance.prefab?.prefabAssetId;
  if (assetId === undefined || instance.prefab === undefined) {
    return { node: instance, missing: false, warnings };
  }
  const expanded = expandPrefabSourceTree(prefab.root, catalog, warnings, [assetId]);
  const merged = mergeSourceOntoInstance(expanded, instance, {
    prefabAssetId: assetId,
    instanceId: instance.prefab.instanceId,
    overrides: instance.prefab.overrides ?? [],
    isRoot: true,
    parentId: instance.parentId,
  });
  applyOverridesToInstance(merged, expanded, instance.prefab.overrides ?? []);
  if (merged.prefab) {
    merged.prefab.overrides =
      (instance.prefab.overrides?.length ?? 0) > 0
        ? cloneJson(instance.prefab.overrides)
        : undefined;
  }
  return { node: merged, missing: false, warnings };
}

export function resolveScenePrefabs(
  scene: SceneData,
  catalog: PrefabCatalog,
): { scene: SceneData; warnings: PrefabResolveWarning[] } {
  if (!sceneHasPrefabInstances(scene)) {
    return { scene, warnings: [] };
  }
  const warnings: PrefabResolveWarning[] = [];
  const nodes = scene.nodes.map((node) =>
    resolveNodeTree(node, catalog, warnings, undefined),
  );
  return {
    scene: {
      ...scene,
      nodes,
    },
    warnings,
  };
}

function sceneHasPrefabInstances(scene: SceneData): boolean {
  const stack: SceneNodeData[] = [...scene.nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (node.prefab !== undefined) {
      return true;
    }
    stack.push(...node.children);
  }
  return false;
}

function resolveNodeTree(
  node: SceneNodeData,
  catalog: PrefabCatalog,
  warnings: PrefabResolveWarning[],
  parentId: string | undefined,
): SceneNodeData {
  if (isPrefabInstanceRoot(node) && node.prefab) {
    const prefab = catalog.get(node.prefab.prefabAssetId);
    if (prefab === undefined) {
      warnings.push({
        code: "MISSING_PREFAB",
        prefabAssetId: node.prefab.prefabAssetId,
        message: `Missing prefab asset ${node.prefab.prefabAssetId}`,
      });
      const kept = cloneJson(node);
      if (parentId !== undefined) {
        kept.parentId = parentId;
      }
      return kept;
    }
    const resolved = resolvePrefabInstance(prefab, node, catalog);
    warnings.push(...resolved.warnings);
    if (parentId !== undefined) {
      resolved.node.parentId = parentId;
    }
    return resolved.node;
  }
  const next: SceneNodeData = {
    ...cloneJson(node),
    children: [],
  };
  if (parentId !== undefined) {
    next.parentId = parentId;
  } else {
    delete next.parentId;
  }
  next.children = node.children.map((child) =>
    resolveNodeTree(child, catalog, warnings, next.id),
  );
  return next;
}

interface MergeContext {
  prefabAssetId: string;
  instanceId: string;
  overrides: readonly PrefabOverride[];
  isRoot: boolean;
  parentId?: string;
}

function mergeSourceOntoInstance(
  source: SceneNodeData,
  existing: SceneNodeData | undefined,
  context: MergeContext,
): SceneNodeData {
  if (existing === undefined) {
    return instantiateFromSource(source, {
      prefabAssetId: context.prefabAssetId,
      instanceId: context.instanceId,
      parentId: context.parentId,
      isRoot: context.isRoot,
    });
  }

  const componentSources = mergeComponents(source, existing);
  const node: SceneNodeData = {
    id: existing.id,
    name: existing.name,
    components: existing.components,
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
  } else {
    delete node.layer;
  }
  if (existing.layer !== undefined && hasLayerOverride(context.overrides, source.id)) {
    node.layer = existing.layer;
  }
  setNodeVisibleField(node, getNodeVisible(source));
  if (hasVisibleOverride(context.overrides, source.id)) {
    setNodeVisibleField(node, getNodeVisible(existing));
  }
  setNodeAlphaField(node, getNodeAlpha(source));
  if (hasAlphaOverride(context.overrides, source.id)) {
    setNodeAlphaField(node, getNodeAlpha(existing));
  }
  setNodePointerEventModeField(node, getNodePointerEventMode(source));
  if (hasPointerEventModeOverride(context.overrides, source.id)) {
    setNodePointerEventModeField(node, getNodePointerEventMode(existing));
  }
  setNodeCursorField(node, getNodeCursor(source));
  if (hasCursorOverride(context.overrides, source.id)) {
    setNodeCursorField(node, getNodeCursor(existing));
  }
  setNodePointerChildrenField(node, getNodePointerChildren(source));
  if (hasPointerChildrenOverride(context.overrides, source.id)) {
    setNodePointerChildrenField(node, getNodePointerChildren(existing));
  }
  if (hasNameOverride(context.overrides, source.id)) {
    node.name = existing.name;
  } else {
    node.name = source.name;
  }
  if (context.parentId !== undefined) {
    node.parentId = context.parentId;
  } else {
    delete node.parentId;
  }

  copyInheritedProperties(source, node, context.overrides);

  const localChildren = existing.children.filter(
    (child) => child.prefab === undefined || child.prefab.instanceId !== context.instanceId,
  );
  const inheritedExisting = existing.children.filter(
    (child) => child.prefab?.instanceId === context.instanceId,
  );

  node.children = source.children.map((sourceChild) => {
    if (sourceChild.prefab?.isRoot === true) {
      const nestedExisting = inheritedExisting.find(
        (child) =>
          child.prefab?.isRoot === true &&
          child.prefab.prefabAssetId === sourceChild.prefab?.prefabAssetId &&
          child.prefab.sourceNodeId === sourceChild.prefab.sourceNodeId,
      );
      if (nestedExisting) {
        return cloneJson(nestedExisting);
      }
      return instantiatePrefab(
        {
          version: 1,
          id: "nested",
          name: sourceChild.name,
          root: sourceChild,
        },
        {
          prefabAssetId: sourceChild.prefab.prefabAssetId,
          instanceId: sourceChild.prefab.instanceId,
          overrides: sourceChild.prefab.overrides,
          parentId: node.id,
        },
      ).node;
    }
    const match = inheritedExisting.find(
      (child) => child.prefab?.sourceNodeId === sourceChild.id,
    );
    return mergeSourceOntoInstance(sourceChild, match, {
      prefabAssetId: context.prefabAssetId,
      instanceId: context.instanceId,
      overrides: context.overrides,
      isRoot: false,
      parentId: node.id,
    });
  });

  for (const local of localChildren) {
    const child = cloneJson(local);
    child.parentId = node.id;
    node.children.push(child);
  }

  return node;
}

function mergeComponents(
  source: SceneNodeData,
  existing: SceneNodeData,
): Record<string, string> {
  const componentSources: Record<string, string> = {
    ...(existing.prefab?.componentSources ?? {}),
  };
  const usedSceneIds = new Set<string>();

  for (const sourceComponent of source.components) {
    const existingSceneId = Object.entries(componentSources).find(
      ([sceneId, sourceId]) => sourceId === sourceComponent.id && !usedSceneIds.has(sceneId),
    )?.[0];
    const existingComponent = existing.components.find(
      (component) => component.id === existingSceneId,
    );
    if (existingComponent) {
      usedSceneIds.add(existingComponent.id);
      continue;
    }
    const created = cloneComponentWithNewId(sourceComponent);
    existing.components.push(created);
    componentSources[created.id] = sourceComponent.id;
    usedSceneIds.add(created.id);
  }

  existing.components = existing.components.filter((component) => {
    const sourceId = componentSources[component.id];
    if (sourceId === undefined) {
      return true;
    }
    return source.components.some((entry) => entry.id === sourceId);
  });

  return componentSources;
}

function copyInheritedProperties(
  source: SceneNodeData,
  instance: SceneNodeData,
  overrides: readonly PrefabOverride[],
): void {
  instance.components = instance.components.map((component) => {
    const sourceId = instance.prefab?.componentSources[component.id];
    if (sourceId === undefined) {
      return component;
    }
    const sourceComponent = source.components.find((entry) => entry.id === sourceId);
    if (sourceComponent === undefined) {
      return component;
    }
    return copyComponentFromSource(sourceComponent, component, source.id, overrides);
  });
}

function copyComponentFromSource(
  source: ComponentData,
  instance: ComponentData,
  sourceNodeId: string,
  overrides: readonly PrefabOverride[],
): ComponentData {
  const next = cloneJson(source);
  next.id = instance.id;
  const instanceRecord = next as unknown as Record<string, unknown>;
  for (const override of overrides) {
    if (
      override.kind !== "property" ||
      override.sourceNodeId !== sourceNodeId ||
      override.componentId !== source.id
    ) {
      continue;
    }
    setValueAtPath(instanceRecord, override.propertyPath, cloneJson(override.value));
  }
  return next;
}

function hasNameOverride(overrides: readonly PrefabOverride[], sourceNodeId: string): boolean {
  return overrides.some(
    (override) => override.kind === "name" && override.sourceNodeId === sourceNodeId,
  );
}

function hasLayerOverride(overrides: readonly PrefabOverride[], sourceNodeId: string): boolean {
  return overrides.some(
    (override) => override.kind === "layer" && override.sourceNodeId === sourceNodeId,
  );
}

function hasVisibleOverride(overrides: readonly PrefabOverride[], sourceNodeId: string): boolean {
  return overrides.some(
    (override) => override.kind === "visible" && override.sourceNodeId === sourceNodeId,
  );
}

function hasAlphaOverride(overrides: readonly PrefabOverride[], sourceNodeId: string): boolean {
  return overrides.some(
    (override) => override.kind === "alpha" && override.sourceNodeId === sourceNodeId,
  );
}

function hasPointerEventModeOverride(
  overrides: readonly PrefabOverride[],
  sourceNodeId: string,
): boolean {
  return overrides.some(
    (override) =>
      override.kind === "pointerEventMode" && override.sourceNodeId === sourceNodeId,
  );
}

function hasCursorOverride(overrides: readonly PrefabOverride[], sourceNodeId: string): boolean {
  return overrides.some(
    (override) => override.kind === "cursor" && override.sourceNodeId === sourceNodeId,
  );
}

function hasPointerChildrenOverride(
  overrides: readonly PrefabOverride[],
  sourceNodeId: string,
): boolean {
  return overrides.some(
    (override) =>
      override.kind === "pointerChildren" && override.sourceNodeId === sourceNodeId,
  );
}

export function instantiatePrefabResolved(
  prefab: PrefabData,
  options: {
    prefabAssetId: string;
    parentId?: string;
    position2D?: { x: number; y: number };
    position3D?: { x: number; y: number; z: number };
    catalog?: PrefabCatalog;
  },
): PrefabResolveResult {
  const warnings: PrefabResolveWarning[] = [];
  const expanded = options.catalog
    ? expandPrefabSourceTree(prefab.root, options.catalog, warnings, [options.prefabAssetId])
    : cloneJson(prefab.root);
  const { node } = instantiatePrefab(
    { ...prefab, root: expanded },
    {
      prefabAssetId: options.prefabAssetId,
      parentId: options.parentId,
      position2D: options.position2D,
      position3D: options.position3D,
    },
  );
  return { node, missing: false, warnings };
}

export function applyOverridesToPrefabAsset(
  prefab: PrefabData,
  overrides: readonly PrefabOverride[],
): PrefabData {
  const next = cloneJson(prefab);
  for (const override of overrides) {
    const sourceNode = findPrefabSourceNode(next.root, override.sourceNodeId);
    if (sourceNode === undefined) {
      continue;
    }
    if (override.kind === "name") {
      sourceNode.name = override.value;
      continue;
    }
    if (override.kind === "layer") {
      sourceNode.layer = override.value;
      continue;
    }
    if (override.kind === "visible") {
      setNodeVisibleField(sourceNode, override.value);
      continue;
    }
    if (override.kind === "alpha") {
      setNodeAlphaField(sourceNode, override.value);
      continue;
    }
    if (override.kind === "pointerEventMode") {
      setNodePointerEventModeField(sourceNode, override.value);
      continue;
    }
    if (override.kind === "cursor") {
      setNodeCursorField(sourceNode, override.value);
      continue;
    }
    if (override.kind === "pointerChildren") {
      setNodePointerChildrenField(sourceNode, override.value);
      continue;
    }
    const component = sourceNode.components.find((entry) => entry.id === override.componentId);
    if (component === undefined) {
      continue;
    }
    const index = sourceNode.components.indexOf(component);
    const record = cloneJson(component) as unknown as Record<string, unknown>;
    setValueAtPath(record, override.propertyPath, override.value);
    sourceNode.components[index] = record as unknown as ComponentData;
  }
  return next;
}

export function createEmptyPrefabId(): string {
  return createId("prefab");
}
