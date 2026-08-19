import { Container } from "pixi.js";
import { getNodePointerChildren, getVisualComponent, type HitZoneComponentData } from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { paintHitZoneOverlay } from "./pixi-hit-zone-overlay.js";
import { pixiHitAreaFromHitZone } from "./pixi-hit-zone-hit-area.js";
import {
  effectiveHitZone,
  groupingNodeUsesHitZonePointer,
} from "./pixi-hit-zone-pick.js";

const PLAYBACK_HIT_TARGET_LABEL = "hitTarget";

/**
 * Editor overlay + playback hitTarget. Never assigns hitArea on the node container.
 */
export function syncHitZoneDisplay(
  runtime: RuntimeNode,
  options: { selected: boolean; strokeScale: number },
): void {
  const hitZone = effectiveHitZone(runtime);
  if (runtime.editable) {
    syncEditorOverlay(
      runtime,
      options.selected ? hitZone : undefined,
      options.strokeScale,
    );
    return;
  }
  syncPlaybackHitTarget(runtime, hitZone);
}

export function applyGroupingHitZoneChildHits(
  runtime: RuntimeNode,
  hitZone: HitZoneComponentData | undefined,
): void {
  if (!runtime.childrenRoot) {
    return;
  }
  const pointerChildren = runtime.editable
    ? true
    : getNodePointerChildren(runtime.node);
  runtime.childrenRoot.interactiveChildren =
    pointerChildren && !groupingNodeUsesHitZonePointer(runtime, hitZone);
}

function syncEditorOverlay(
  runtime: RuntimeNode,
  hitZone: HitZoneComponentData | undefined,
  strokeScale: number,
): void {
  const overlay = runtime.hitZoneOverlay;
  if (!overlay) {
    return;
  }
  paintHitZoneOverlay(overlay, hitZone, strokeScale);
  const interactive =
    hitZone !== undefined && runtime.editable && !runtime.editorLocked;
  overlay.eventMode = interactive ? "static" : "none";
  overlay.cursor = "move";
  overlay.hitArea = interactive ? pixiHitAreaFromHitZone(hitZone) : undefined;
}

function syncPlaybackHitTarget(
  runtime: RuntimeNode,
  hitZone: ReturnType<typeof effectiveHitZone>,
): void {
  if (!hitZone) {
    clearPlaybackHitTarget(runtime);
    return;
  }
  let target = runtime.hitZoneTarget;
  if (!target) {
    target = new Container();
    target.eventMode = "static";
    target.label = PLAYBACK_HIT_TARGET_LABEL;
    runtime.container.addChild(target);
    runtime.hitZoneTarget = target;
  }
  target.hitArea = pixiHitAreaFromHitZone(hitZone);
  target.cursor = runtime.container.cursor;
  const visual = runtime.visual;
  if (visual && getVisualComponent(runtime.node)) {
    visual.eventMode = "none";
  }
  applyGroupingHitZoneChildHits(runtime, hitZone);
}

function clearPlaybackHitTarget(runtime: RuntimeNode): void {
  const target = runtime.hitZoneTarget;
  if (target) {
    target.removeFromParent();
    target.destroy();
    runtime.hitZoneTarget = undefined;
  }
  if (runtime.visual) {
    runtime.visual.eventMode = "auto";
  }
  applyGroupingHitZoneChildHits(runtime, undefined);
}
