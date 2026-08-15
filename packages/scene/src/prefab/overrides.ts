import type { ComponentData, SceneNodeData } from "../types.js";
import type {
  PrefabLayerOverride,
  PrefabNameOverride,
  PrefabOverride,
  PrefabPropertyOverride,
} from "./types.js";
import {
  cloneJson,
  collectChangedPropertyPaths,
  deleteValueAtPath,
  getValueAtPath,
  isPlainObject,
  prefabValuesEqual,
  setValueAtPath,
} from "./property-path.js";
import { findInstanceNodeBySourceId, getPrefabInstanceOverrides } from "./queries.js";

export function sortPrefabOverrides(overrides: readonly PrefabOverride[]): PrefabOverride[] {
  return [...overrides].sort((left, right) => {
    const nodeCompare = left.sourceNodeId.localeCompare(right.sourceNodeId);
    if (nodeCompare !== 0) {
      return nodeCompare;
    }
    const kindCompare = left.kind.localeCompare(right.kind);
    if (kindCompare !== 0) {
      return kindCompare;
    }
    if (left.kind === "property" && right.kind === "property") {
      const componentCompare = left.componentId.localeCompare(right.componentId);
      if (componentCompare !== 0) {
        return componentCompare;
      }
      return left.propertyPath.localeCompare(right.propertyPath);
    }
    return 0;
  });
}

export function findPropertyOverride(
  overrides: readonly PrefabOverride[],
  sourceNodeId: string,
  sourceComponentId: string,
  propertyPath: string,
): PrefabPropertyOverride | undefined {
  return overrides.find(
    (override): override is PrefabPropertyOverride =>
      override.kind === "property" &&
      override.sourceNodeId === sourceNodeId &&
      override.componentId === sourceComponentId &&
      override.propertyPath === propertyPath,
  );
}

export function isPropertyOverridden(
  root: SceneNodeData,
  sourceNodeId: string,
  sourceComponentId: string,
  propertyPath: string,
): boolean {
  return (
    findPropertyOverride(
      getPrefabInstanceOverrides(root),
      sourceNodeId,
      sourceComponentId,
      propertyPath,
    ) !== undefined
  );
}

export function upsertPrefabOverride(
  overrides: readonly PrefabOverride[],
  next: PrefabOverride,
): PrefabOverride[] {
  const filtered = overrides.filter((override) => !sameOverrideKey(override, next));
  filtered.push(cloneJson(next));
  return sortPrefabOverrides(filtered);
}

export function removePrefabOverride(
  overrides: readonly PrefabOverride[],
  match: PrefabOverride,
): PrefabOverride[] {
  return sortPrefabOverrides(
    overrides.filter((override) => !sameOverrideKey(override, match)),
  );
}

function sameOverrideKey(left: PrefabOverride, right: PrefabOverride): boolean {
  if (left.kind !== right.kind || left.sourceNodeId !== right.sourceNodeId) {
    return false;
  }
  if (left.kind === "property" && right.kind === "property") {
    return (
      left.componentId === right.componentId && left.propertyPath === right.propertyPath
    );
  }
  return true;
}

export function applyPropertyOverrideToComponent(
  component: ComponentData,
  propertyPath: string,
  value: unknown,
): ComponentData {
  const next = cloneJson(component) as unknown as Record<string, unknown>;
  setValueAtPath(next, propertyPath, cloneJson(value));
  return next as unknown as ComponentData;
}

export function revertPropertyOnComponent(
  instance: ComponentData,
  source: ComponentData,
  propertyPath: string,
): ComponentData {
  const next = cloneJson(instance) as unknown as Record<string, unknown>;
  const sourceRecord = source as unknown as Record<string, unknown>;
  const sourceValue = getValueAtPath(sourceRecord, propertyPath);
  if (sourceValue === undefined) {
    deleteValueAtPath(next, propertyPath);
  } else {
    setValueAtPath(next, propertyPath, cloneJson(sourceValue));
  }
  return next as unknown as ComponentData;
}

export function computePrefabOverrides(
  sourceRoot: SceneNodeData,
  instanceRoot: SceneNodeData,
): PrefabOverride[] {
  const overrides: PrefabOverride[] = [];
  const visit = (source: SceneNodeData): void => {
    const instance = findInstanceNodeBySourceId(instanceRoot, source.id);
    if (instance === undefined) {
      return;
    }
    if (instance.name !== source.name) {
      const nameOverride: PrefabNameOverride = {
        kind: "name",
        sourceNodeId: source.id,
        value: instance.name,
      };
      overrides.push(nameOverride);
    }
    const sourceLayer = source.layer;
    const instanceLayer = instance.layer;
    if (instanceLayer !== sourceLayer) {
      if (instanceLayer !== undefined) {
        const layerOverride: PrefabLayerOverride = {
          kind: "layer",
          sourceNodeId: source.id,
          value: instanceLayer,
        };
        overrides.push(layerOverride);
      }
    }
    for (const sourceComponent of source.components) {
      const sceneComponentId = Object.entries(instance.prefab?.componentSources ?? {}).find(
        ([, sourceId]) => sourceId === sourceComponent.id,
      )?.[0];
      const instanceComponent = instance.components.find(
        (component) => component.id === sceneComponentId,
      );
      if (instanceComponent === undefined) {
        continue;
      }
      const paths = collectChangedPropertyPaths(
        sourceComponent as unknown as Record<string, unknown>,
        instanceComponent as unknown as Record<string, unknown>,
      );
      for (const propertyPath of paths) {
        const instanceRecord = instanceComponent as unknown as Record<string, unknown>;
        overrides.push({
          kind: "property",
          sourceNodeId: source.id,
          componentId: sourceComponent.id,
          propertyPath,
          value: cloneJson(getValueAtPath(instanceRecord, propertyPath)),
        });
      }
    }
    for (const child of source.children) {
      visit(child);
    }
  };
  visit(sourceRoot);
  return sortPrefabOverrides(overrides);
}

export function applyOverridesToInstance(
  instanceRoot: SceneNodeData,
  sourceRoot: SceneNodeData,
  overrides: readonly PrefabOverride[],
): void {
  for (const override of overrides) {
    const instance = findInstanceNodeBySourceId(instanceRoot, override.sourceNodeId);
    if (instance === undefined) {
      continue;
    }
    if (override.kind === "name") {
      instance.name = override.value;
      continue;
    }
    if (override.kind === "layer") {
      instance.layer = override.value;
      continue;
    }
    const sceneComponentId = Object.entries(instance.prefab?.componentSources ?? {}).find(
      ([, sourceId]) => sourceId === override.componentId,
    )?.[0];
    if (sceneComponentId === undefined) {
      continue;
    }
    const index = instance.components.findIndex((component) => component.id === sceneComponentId);
    const component = instance.components[index];
    if (component === undefined) {
      continue;
    }
    instance.components[index] = applyPropertyOverrideToComponent(
      component,
      override.propertyPath,
      override.value,
    );
  }
  void sourceRoot;
}

export function applySourceValueToPrefabNode(
  sourceNode: SceneNodeData,
  override: PrefabPropertyOverride,
): void {
  const component = sourceNode.components.find((entry) => entry.id === override.componentId);
  if (component === undefined) {
    return;
  }
  const index = sourceNode.components.indexOf(component);
  sourceNode.components[index] = applyPropertyOverrideToComponent(
    component,
    override.propertyPath,
    override.value,
  );
}

export function applyNameOrLayerToPrefabNode(
  sourceNode: SceneNodeData,
  override: PrefabNameOverride | PrefabLayerOverride,
): void {
  if (override.kind === "name") {
    sourceNode.name = override.value;
    return;
  }
  sourceNode.layer = override.value;
}

export function findPrefabSourceNode(
  sourceRoot: SceneNodeData,
  sourceNodeId: string,
): SceneNodeData | undefined {
  const stack: SceneNodeData[] = [sourceRoot];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (node.id === sourceNodeId) {
      return node;
    }
    stack.push(...node.children);
  }
  return undefined;
}

export function componentRecord(component: ComponentData): Record<string, unknown> {
  if (!isPlainObject(component)) {
    return {};
  }
  return component;
}
