import type { SceneNodeData } from "./types.js";
import {
  isLeafVisualComponentType,
  type LeafVisualComponentType,
  type VisualComponentData,
} from "./visual-components.js";

/**
 * True when the node may accept scene children.
 * Container-like nodes (Transform2D only, or no leaf visual) may have children.
 * Renderable leaf visuals (Sprite, Text, Mesh*, …) may not.
 */
export function nodeCanHaveChildren(node: SceneNodeData): boolean {
  return getLeafVisualComponent(node) === undefined;
}

export function getLeafVisualComponent(
  node: SceneNodeData,
): VisualComponentData | undefined {
  return node.components.find(
    (component): component is VisualComponentData =>
      isLeafVisualComponentType(component.type),
  );
}

export function getLeafVisualType(
  node: SceneNodeData,
): LeafVisualComponentType | undefined {
  return getLeafVisualComponent(node)?.type;
}

/**
 * Maps a domain visual/container to the stable editor registry id (`pixi.*`).
 * Container = Transform2D present and no leaf visual.
 */
export function getNodeTypeId(node: SceneNodeData): string | undefined {
  const leaf = getLeafVisualType(node);
  if (leaf) {
    return visualTypeToNodeTypeId(leaf);
  }
  const hasTransform2D = node.components.some((c) => c.type === "Transform2D");
  if (hasTransform2D) {
    return "pixi.container";
  }
  return undefined;
}

export function visualTypeToNodeTypeId(type: LeafVisualComponentType): string {
  switch (type) {
    case "Sprite":
      return "pixi.sprite";
    case "NineSliceSprite":
      return "pixi.nine-slice-sprite";
    case "TilingSprite":
      return "pixi.tiling-sprite";
    case "Graphics":
      return "pixi.graphics";
    case "Text":
      return "pixi.text";
    case "BitmapText":
      return "pixi.bitmap-text";
    case "HTMLText":
      return "pixi.html-text";
    case "Mesh":
      return "pixi.mesh";
    case "MeshSimple":
      return "pixi.mesh-simple";
    case "MeshRope":
      return "pixi.mesh-rope";
    case "MeshPlane":
      return "pixi.mesh-plane";
    case "PerspectiveMesh":
      return "pixi.perspective-mesh";
    case "AnimatedSprite":
      return "pixi.animated-sprite";
    case "Spine":
      return "pixi.spine";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Hierarchy icon glyph for a node (plain text, not emoji). */
export function getNodeTypeIcon(node: SceneNodeData): string {
  const leaf = getLeafVisualType(node);
  switch (leaf) {
    case "Sprite":
      return "▧";
    case "NineSliceSprite":
      return "▦";
    case "TilingSprite":
      return "▩";
    case "Graphics":
      return "◯";
    case "Text":
      return "T";
    case "BitmapText":
      return "B";
    case "HTMLText":
      return "H";
    case "Mesh":
    case "MeshSimple":
    case "MeshRope":
    case "MeshPlane":
    case "PerspectiveMesh":
      return "△";
    case "AnimatedSprite":
      return "▷";
    case "Spine":
      return "◇";
    case undefined:
      return "▣";
    default: {
      const _exhaustive: never = leaf;
      return _exhaustive;
    }
  }
}
