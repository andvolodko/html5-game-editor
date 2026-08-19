import {
  getHitZone,
  getNodePointerChildren,
  getNodePointerEventMode,
  getVisualComponent,
  hitZoneLocalAabb,
  isHitZoneEnabled,
  localPointHitsHitZone,
  unionLocalAabb,
  type HitZoneComponentData,
  type Vec2,
} from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import type { VisualBounds } from "./visuals/types.js";
import { convertScreenToNodeLocal } from "./pixi-hit-zone-hit-area.js";

const MIN_PICK_AREA = 1;

export function sceneHitZone(
  runtime: RuntimeNode,
): HitZoneComponentData | undefined {
  return runtime.hitZonePreview ?? getHitZone(runtime.node);
}

export function effectiveHitZone(
  runtime: RuntimeNode,
): HitZoneComponentData | undefined {
  const hitZone = sceneHitZone(runtime);
  if (!hitZone || !isHitZoneEnabled(hitZone)) {
    return undefined;
  }
  return hitZone;
}

/** Chrome AABB: visual/grouping bounds union enabled HitZone (editor picking). */
export function chromeHitBounds(
  runtime: RuntimeNode,
  visualBounds: VisualBounds | undefined,
): VisualBounds | undefined {
  const hitZone = effectiveHitZone(runtime);
  const zoneBounds = hitZone ? hitZoneLocalAabb(hitZone) : undefined;
  return unionLocalAabb(
    [visualBounds, zoneBounds].filter((box): box is VisualBounds =>
      box !== undefined && box.width > 0 && box.height > 0,
    ),
  );
}

/**
 * Playback grouping nodes: an enabled HitZone is the pointer target, so child
 * sprites must not steal hits (Button, AudioClick, … on the container).
 */
export function groupingNodeUsesHitZonePointer(
  runtime: RuntimeNode,
  hitZone: HitZoneComponentData | undefined,
): boolean {
  return (
    !runtime.editable &&
    hitZone !== undefined &&
    getVisualComponent(runtime.node) === undefined
  );
}

/**
 * Hybrid overlay pick (canvases have `pointer-events: none`) must match Pixi
 * EventSystem: `none`/`passive` are not targets, grouping HitZone owns hits,
 * and `pointerChildren: false` skips descendants. Editor pick stays selectable.
 */
export function isPlaybackOverlayPointerTarget(
  runtime: RuntimeNode,
  getRuntime: (nodeId: string) => RuntimeNode | undefined,
): boolean {
  if (runtime.editable) {
    return true;
  }
  const mode = getNodePointerEventMode(runtime.node);
  if (mode === "none" || mode === "passive") {
    return false;
  }
  let parentId = runtime.node.parentId;
  while (parentId !== undefined) {
    const parent = getRuntime(parentId);
    if (!parent) {
      break;
    }
    if (getNodePointerEventMode(parent.node) === "none") {
      return false;
    }
    if (!getNodePointerChildren(parent.node)) {
      return false;
    }
    if (groupingNodeUsesHitZonePointer(parent, effectiveHitZone(parent))) {
      return false;
    }
    parentId = parent.node.parentId;
  }
  return true;
}

/**
 * Smallest hitting area wins. Playback overlay skips nodes that Pixi would not
 * treat as the interaction target (HitZone children, `pointerEventMode: none`).
 */
export function pickRuntimeNodeId(
  runtimes: Iterable<RuntimeNode>,
  screen: Vec2,
  getRuntime: (nodeId: string) => RuntimeNode | undefined,
): string | undefined {
  let bestId: string | undefined;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const runtime of runtimes) {
    if (!isPlaybackOverlayPointerTarget(runtime, getRuntime)) {
      continue;
    }
    const area = pickAreaIfHit(runtime, screen);
    if (area === undefined || area >= bestArea) {
      continue;
    }
    bestArea = area;
    bestId = runtime.node.id;
  }
  return bestId;
}

/**
 * Pick score (smaller wins). Playback: HitZone replaces visual bounds.
 * Edit mode: union — either visual AABB or HitZone counts.
 */
export function pickAreaIfHit(
  runtime: RuntimeNode,
  screen: Vec2,
): number | undefined {
  const hitZone = effectiveHitZone(runtime);
  const local = convertScreenToNodeLocal(runtime.container, screen);
  if (hitZone && localPointHitsHitZone(hitZone, local)) {
    const aabb = hitZoneLocalAabb(hitZone);
    return pickArea(aabb, runtime);
  }
  if (hitZone && !runtime.editable) {
    return undefined;
  }
  const target = runtime.visual ?? runtime.visualsRoot;
  if (!target || !target.visible) {
    return undefined;
  }
  const bounds = target.getBounds();
  if (
    screen.x < bounds.x ||
    screen.y < bounds.y ||
    screen.x > bounds.x + bounds.width ||
    screen.y > bounds.y + bounds.height
  ) {
    return undefined;
  }
  return Math.max(MIN_PICK_AREA, bounds.width * bounds.height);
}

function pickArea(aabb: VisualBounds, runtime: RuntimeNode): number {
  const scaleX = runtime.container.worldTransform.a;
  const scaleY = runtime.container.worldTransform.d;
  const area = aabb.width * aabb.height * Math.abs(scaleX * scaleY);
  return Math.max(MIN_PICK_AREA, area);
}
