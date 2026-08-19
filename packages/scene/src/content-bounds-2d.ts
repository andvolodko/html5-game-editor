import type { SceneData, SceneNodeData } from "./types.js";
import { flattenNodes, getTransform2D, getVisualComponent } from "./queries.js";
import { getWorldAff2 } from "./transform-math.js";
import { transformLocalAabb, unionLocalAabb, type LocalAabb, aabbIntersects } from "./local-aabb.js";
import {
  getVisualAnchorOrDefault,
  getVisualDisplaySize,
} from "./visual-components.js";
import { tilemapLocalBounds } from "./tilemap.js";
import { DEFAULT_TILEMAP_EMPTY_EXTENT_TILES } from "./defaults.js";

const ORIGIN_FALLBACK: LocalAabb = { x: -8, y: -8, width: 16, height: 16 };

/**
 * World-space AABB of 2D visuals (and transform origins) in a scene.
 * Used to frame prefab edit mode in the preview camera.
 */
export function collectSceneContentBounds2D(
  scene: SceneData,
): LocalAabb | undefined {
  const boxes: LocalAabb[] = [];
  for (const node of flattenNodes(scene)) {
    if (!getTransform2D(node)) {
      continue;
    }
    boxes.push(
      transformLocalAabb(localContentAabb(node), getWorldAff2(scene, node.id)),
    );
  }
  return unionLocalAabb(boxes);
}

/** World-space AABB of a 2D node's visual (or origin fallback). */
export function nodeWorldContentAabb2D(
  scene: SceneData,
  node: SceneNodeData,
): LocalAabb | undefined {
  if (!getTransform2D(node)) {
    return undefined;
  }
  return transformLocalAabb(localContentAabb(node), getWorldAff2(scene, node.id));
}

/**
 * Ids of Transform2D nodes whose world AABB overlaps `rect`.
 * Optional `include` filters candidates (e.g. skip editor-hidden nodes).
 */
export function nodesIntersectingWorldAabb(
  scene: SceneData,
  rect: LocalAabb,
  include?: (node: SceneNodeData) => boolean,
): string[] {
  if (rect.width <= 0 || rect.height <= 0) {
    return [];
  }
  const ids: string[] = [];
  for (const node of flattenNodes(scene)) {
    if (include !== undefined && !include(node)) {
      continue;
    }
    const box = nodeWorldContentAabb2D(scene, node);
    if (box && aabbIntersects(box, rect)) {
      ids.push(node.id);
    }
  }
  return ids;
}

function localContentAabb(node: SceneNodeData): LocalAabb {
  const visual = getVisualComponent(node);
  if (visual?.type === "Tilemap") {
    return tilemapLocalBounds(visual, DEFAULT_TILEMAP_EMPTY_EXTENT_TILES);
  }
  const size = visual ? getVisualDisplaySize(visual) : undefined;
  if (!visual || size === undefined || size.width <= 0 || size.height <= 0) {
    return { ...ORIGIN_FALLBACK };
  }
  const anchor = getVisualAnchorOrDefault(visual);
  return {
    x: -size.width * anchor.x,
    y: -size.height * anchor.y,
    width: size.width,
    height: size.height,
  };
}
