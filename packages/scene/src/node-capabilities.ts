import type { SceneNodeData } from "./types.js";
import {
  isLeafVisualComponentType,
  type LeafVisualComponentType,
  type VisualComponentData,
} from "./visual-components.js";
import {
  isLeafThreeComponentType,
  type LeafThreeComponentType,
  type ThreeComponentData,
} from "./three-components.js";

/**
 * True when the node may accept scene children.
 * Container-like nodes (Transform only, or no leaf visual/three) may have children.
 * Renderable leaves (Sprite, Model3D, …) may not.
 */
export function nodeCanHaveChildren(node: SceneNodeData): boolean {
  return (
    getLeafVisualComponent(node) === undefined &&
    getLeafThreeComponent(node) === undefined
  );
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

export function getLeafThreeComponent(
  node: SceneNodeData,
): ThreeComponentData | undefined {
  return node.components.find(
    (component): component is ThreeComponentData =>
      isLeafThreeComponentType(component.type),
  );
}

export function getLeafThreeType(
  node: SceneNodeData,
): LeafThreeComponentType | undefined {
  return getLeafThreeComponent(node)?.type;
}

/**
 * Maps a domain visual/container to the stable editor registry id (`pixi.*` / `three.*`).
 */
export function getNodeTypeId(node: SceneNodeData): string | undefined {
  const leaf = getLeafVisualType(node);
  if (leaf) {
    return visualTypeToNodeTypeId(leaf);
  }
  const threeLeaf = getLeafThreeType(node);
  if (threeLeaf) {
    return threeTypeToNodeTypeId(threeLeaf);
  }
  const hasTransform3D = node.components.some((c) => c.type === "Transform3D");
  if (hasTransform3D) {
    return "three.container";
  }
  const hasTransform2D = node.components.some((c) => c.type === "Transform2D");
  if (hasTransform2D) {
    if (node.components.some((c) => c.type === "HitZone")) {
      return "pixi.hit-zone";
    }
    if (node.components.some((c) => c.type === "Mask")) {
      return "pixi.mask";
    }
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
    case "Tilemap":
      return "pixi.tilemap";
    case "ParticleEmitter":
      return "pixi.particle-emitter";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function threeTypeToNodeTypeId(type: LeafThreeComponentType): string {
  switch (type) {
    case "Model3D":
      return "three.model";
    case "PerspectiveCamera":
      return "three.perspective-camera";
    case "DirectionalLight":
      return "three.directional-light";
    case "AmbientLight":
      return "three.ambient-light";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Hierarchy icon glyph for a node (plain text, not emoji). */
export function getNodeTypeIcon(node: SceneNodeData): string {
  if (node.prefab?.isRoot === true) {
    return "◇";
  }
  const threeLeaf = getLeafThreeType(node);
  if (threeLeaf) {
    switch (threeLeaf) {
      case "Model3D":
        return "▣";
      case "PerspectiveCamera":
        return "◎";
      case "DirectionalLight":
        return "☀";
      case "AmbientLight":
        return "○";
      default: {
        const _exhaustive: never = threeLeaf;
        return _exhaustive;
      }
    }
  }
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
    case "Tilemap":
      return "⊞";
    case "ParticleEmitter":
      return "✦";
    case undefined:
      if (node.components.some((c) => c.type === "HitZone")) {
        return "▭";
      }
      if (node.components.some((c) => c.type === "Mask")) {
        return "◐";
      }
      return "▣";
    default: {
      const _exhaustive: never = leaf;
      return _exhaustive;
    }
  }
}
