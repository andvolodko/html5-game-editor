import type { SceneNodeData } from "./types.js";
import { getTransform2D, getTransform3D } from "./queries.js";

/** 2D stack slot for hybrid Pixi-under / Three / Pixi-over composition. */
export type SceneNodeLayer = "background" | "foreground";

export type SceneRendererKind = "pixi" | "three" | "hybrid";

/** Transform space used for parenting compatibility (2D vs 3D). */
export type NodeTransformSpace = "2d" | "3d";

/** Effective scene viewport mode (defaults to pixi). */
export function getSceneRendererKind(scene: {
  renderer?: SceneRendererKind;
}): SceneRendererKind {
  return scene.renderer ?? "pixi";
}

/** 2D layer for hybrid stacking (defaults to background). */
export function getNodeLayer(node: SceneNodeData): SceneNodeLayer {
  return node.layer === "foreground" ? "foreground" : "background";
}

/**
 * Transform space for hierarchy rules.
 * Nodes with both or neither transform return undefined (not parentable across).
 */
export function getNodeTransformSpace(
  node: SceneNodeData,
): NodeTransformSpace | undefined {
  const has2d = getTransform2D(node) !== undefined;
  const has3d = getTransform3D(node) !== undefined;
  if (has2d === has3d) {
    return undefined;
  }
  return has3d ? "3d" : "2d";
}

/** True when child may be parented under parent in the same transform space. */
export function canParentAcrossTransformSpace(
  child: SceneNodeData,
  parent: SceneNodeData,
): boolean {
  const childSpace = getNodeTransformSpace(child);
  const parentSpace = getNodeTransformSpace(parent);
  if (childSpace === undefined || parentSpace === undefined) {
    return false;
  }
  return childSpace === parentSpace;
}

export function nodeBelongsToPixiBackground(node: SceneNodeData): boolean {
  return getTransform2D(node) !== undefined && getNodeLayer(node) !== "foreground";
}

export function nodeBelongsToPixiForeground(node: SceneNodeData): boolean {
  return getTransform2D(node) !== undefined && getNodeLayer(node) === "foreground";
}

export function nodeBelongsToThree(node: SceneNodeData): boolean {
  return getTransform3D(node) !== undefined;
}

export function nodeBelongsToPixi(node: SceneNodeData): boolean {
  return getTransform2D(node) !== undefined;
}
