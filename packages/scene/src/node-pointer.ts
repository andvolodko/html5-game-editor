import type { SceneNodeData } from "./types.js";

/** Pixi-compatible hit-testing modes. Serialized; not a PIXI enum. */
export const NODE_POINTER_EVENT_MODES = [
  "none",
  "passive",
  "auto",
  "static",
  "dynamic",
] as const;

export type NodePointerEventMode = (typeof NODE_POINTER_EVENT_MODES)[number];

/** Playback default matches current Pixi containers (`eventMode: "static"`). */
export const DEFAULT_NODE_POINTER_EVENT_MODE: NodePointerEventMode = "static";

/** Omitted `pointerChildren` means children can receive pointer events. */
export const DEFAULT_NODE_POINTER_CHILDREN = true;

/** Common CSS cursor names for Inspector presets. Empty string = engine default. */
export const NODE_CURSOR_PRESETS = [
  "",
  "default",
  "pointer",
  "grab",
  "grabbing",
  "move",
  "crosshair",
  "text",
  "wait",
  "help",
  "not-allowed",
  "none",
] as const;

export type NodeCursorPreset = (typeof NODE_CURSOR_PRESETS)[number];

export const NODE_CURSOR_MAX_LENGTH = 128;

export function isNodePointerEventMode(value: string): value is NodePointerEventMode {
  return (NODE_POINTER_EVENT_MODES as readonly string[]).includes(value);
}

export function getNodePointerEventMode(node: {
  pointerEventMode?: NodePointerEventMode;
}): NodePointerEventMode {
  return node.pointerEventMode ?? DEFAULT_NODE_POINTER_EVENT_MODE;
}

export function getNodeCursor(node: { cursor?: string }): string {
  return node.cursor ?? "";
}

export function getNodePointerChildren(node: { pointerChildren?: boolean }): boolean {
  return node.pointerChildren !== false;
}

/** Persist when not the playback default; omit `"static"` (Git-friendly). */
export function setNodePointerEventModeField(
  node: SceneNodeData,
  eventMode: NodePointerEventMode,
): void {
  if (eventMode === DEFAULT_NODE_POINTER_EVENT_MODE) {
    delete node.pointerEventMode;
    return;
  }
  node.pointerEventMode = eventMode;
}

/** Persist a CSS cursor; omit when empty. */
export function setNodeCursorField(node: SceneNodeData, cursor: string): void {
  const next = cursor.trim();
  if (next.length === 0) {
    delete node.cursor;
    return;
  }
  node.cursor = next.slice(0, NODE_CURSOR_MAX_LENGTH);
}

/** Persist `false` when children should not receive pointer events; omit true. */
export function setNodePointerChildrenField(
  node: SceneNodeData,
  pointerChildren: boolean,
): void {
  if (pointerChildren) {
    delete node.pointerChildren;
    return;
  }
  node.pointerChildren = false;
}

export function copyNodePointer(source: SceneNodeData, target: SceneNodeData): void {
  if (source.pointerEventMode !== undefined) {
    target.pointerEventMode = source.pointerEventMode;
  }
  if (source.cursor !== undefined) {
    target.cursor = source.cursor;
  }
  if (source.pointerChildren !== undefined) {
    target.pointerChildren = source.pointerChildren;
  }
}
