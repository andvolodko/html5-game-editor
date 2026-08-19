import type { EventMode } from "pixi.js";
import {
  getNodeCursor,
  getNodePointerEventMode,
} from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { applyGroupingHitZoneChildHits } from "./pixi-hit-zone-sync.js";
import { effectiveHitZone } from "./pixi-hit-zone-pick.js";

function toPixiEventMode(mode: ReturnType<typeof getNodePointerEventMode>): EventMode {
  return mode;
}

/**
 * Playback eventMode after HitZone sync. Editor mode keeps grab/static.
 */
export function applyPlaybackPointerEventMode(runtime: RuntimeNode): void {
  if (runtime.editable) {
    return;
  }
  const eventMode = toPixiEventMode(getNodePointerEventMode(runtime.node));
  runtime.container.eventMode = eventMode;
  if (runtime.hitZoneTarget) {
    runtime.hitZoneTarget.eventMode = eventMode === "none" ? "none" : "static";
  }
  applyGroupingHitZoneChildHits(runtime, effectiveHitZone(runtime));
}

/** Serialized CSS cursor. Empty string clears to the engine default. */
export function applyPlaybackPointerCursor(runtime: RuntimeNode): void {
  if (runtime.editable) {
    return;
  }
  const cursor = getNodeCursor(runtime.node);
  runtime.container.cursor = cursor;
  runtime.visualsRoot.cursor = cursor;
  if (runtime.hitZoneTarget) {
    runtime.hitZoneTarget.cursor = cursor;
  }
}
