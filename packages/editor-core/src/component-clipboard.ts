import type { ComponentRegistry } from "@game-editor/game-components";
import {
  findScript,
  getHitZone,
  getMask,
  getTransform2D,
  type ComponentData,
  type HitZoneComponentData,
  type MaskComponentData,
  type SceneNodeData,
  type ScriptComponentData,
} from "@game-editor/scene";

export type CopyableComponent =
  | ScriptComponentData
  | HitZoneComponentData
  | MaskComponentData;

/**
 * In-memory copy buffer for Inspector Script / HitZone / Mask components.
 * Snapshots are JSON clones so paste still works after the source is removed.
 */
export class ComponentClipboard {
  private snapshots: CopyableComponent[] = [];

  copy(components: readonly CopyableComponent[]): boolean {
    if (components.length === 0) {
      return false;
    }
    this.snapshots = components.map((component) => structuredClone(component));
    return true;
  }

  hasContent(): boolean {
    return this.snapshots.length > 0;
  }

  templates(): readonly CopyableComponent[] {
    return this.snapshots;
  }
}

export function isCopyableComponent(
  component: ComponentData,
): component is CopyableComponent {
  return (
    component.type === "Script" ||
    component.type === "HitZone" ||
    component.type === "Mask"
  );
}

export function listCopyableComponents(
  node: SceneNodeData,
): CopyableComponent[] {
  return node.components.filter(isCopyableComponent);
}

export function describeCopiedComponent(
  component: CopyableComponent,
  registry: ComponentRegistry,
): string {
  if (component.type === "HitZone") {
    return "Hit Zone";
  }
  if (component.type === "Mask") {
    return "Mask";
  }
  return registry.get(component.scriptId)?.displayName ?? component.scriptId;
}

export function describeCopiedComponents(
  components: readonly CopyableComponent[],
  registry: ComponentRegistry,
): string | undefined {
  const first = components[0];
  if (first === undefined) {
    return undefined;
  }
  if (components.length === 1) {
    return describeCopiedComponent(first, registry);
  }
  return `${String(components.length)} components`;
}

/** Why `component` cannot be pasted onto `node`, or `undefined` if paste is allowed. */
export function pasteComponentRejection(
  node: SceneNodeData,
  component: CopyableComponent,
  registry: ComponentRegistry,
): string | undefined {
  if (component.type === "HitZone") {
    if (!getTransform2D(node)) {
      return "Hit Zone requires a 2D node";
    }
    if (getHitZone(node)) {
      return "Hit Zone already on this node";
    }
    return undefined;
  }
  if (component.type === "Mask") {
    if (!getTransform2D(node)) {
      return "Mask requires a 2D node";
    }
    if (getMask(node)) {
      return "Mask already on this node";
    }
    return undefined;
  }
  const definition = registry.get(component.scriptId);
  if (definition?.allowMultiple === true) {
    return undefined;
  }
  if (findScript(node, component.scriptId)) {
    const name = definition?.displayName ?? component.scriptId;
    return `"${name}" already on this node`;
  }
  return undefined;
}

/**
 * Templates that can be pasted onto `node` in order, skipping duplicates
 * that would be invalid after earlier items in the same batch.
 */
export function selectPasteableComponents(
  node: SceneNodeData,
  templates: readonly CopyableComponent[],
  registry: ComponentRegistry,
): CopyableComponent[] {
  const simulated: SceneNodeData = {
    ...node,
    components: [...node.components],
  };
  const accepted: CopyableComponent[] = [];
  for (const template of templates) {
    if (pasteComponentRejection(simulated, template, registry)) {
      continue;
    }
    accepted.push(template);
    simulated.components.push(template);
  }
  return accepted;
}

export function pasteComponentsBlockedReason(
  node: SceneNodeData,
  templates: readonly CopyableComponent[],
  registry: ComponentRegistry,
): string | undefined {
  if (templates.length === 0) {
    return "No component on the clipboard";
  }
  const pasteable = selectPasteableComponents(node, templates, registry);
  if (pasteable.length > 0) {
    return undefined;
  }
  const only = templates.length === 1 ? templates[0] : undefined;
  if (only) {
    return pasteComponentRejection(node, only, registry) ?? "Cannot paste onto this node";
  }
  return "None of the copied components can be pasted onto this node";
}
