import type { EventBus } from "@game-editor/core";

/**
 * Property field kinds for Script components (inspector + defaults).
 */
export type ComponentPropertyKind =
  | "number"
  | "string"
  | "boolean"
  | "enum"
  | "dynamicEnum"
  | "asset";

/** Asset catalogue kinds selectable from Script inspector fields. */
export type ComponentAssetType = "texture" | "spine" | "audio" | "gltf";

/**
 * Playback pointer events forwarded from the Pixi host (no PIXI types here).
 * `pointertap` is press+release without drag (same as `onNodeClick`).
 */
export const NODE_POINTER_EVENTS = [
  "pointerdown",
  "pointerup",
  "pointertap",
  "pointerover",
  "pointerout",
] as const;

export type NodePointerEventName = (typeof NODE_POINTER_EVENTS)[number];

export interface ComponentPropertyNumber {
  kind: "number";
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentPropertyString {
  kind: "string";
  default: string;
}

export interface ComponentPropertyBoolean {
  kind: "boolean";
  default: boolean;
}

export interface ComponentPropertyEnum {
  kind: "enum";
  default: string;
  options: readonly string[];
}

/**
 * Enum whose options are resolved at inspector time (not baked into the definition).
 * - scenes: project scene file ids
 * - busEvents: game-exported bus event ids
 */
export type DynamicEnumSource = "scenes" | "busEvents";

export interface ComponentPropertyDynamicEnum {
  kind: "dynamicEnum";
  default: string;
  source: DynamicEnumSource;
}

/** Catalogue-backed asset id picker; empty string means unset. */
export interface ComponentPropertyAsset {
  kind: "asset";
  assetType: ComponentAssetType;
  default: string;
}

export type ComponentPropertyDefinition =
  | ComponentPropertyNumber
  | ComponentPropertyString
  | ComponentPropertyBoolean
  | ComponentPropertyEnum
  | ComponentPropertyDynamicEnum
  | ComponentPropertyAsset;

/**
 * Runtime instance constructed for a Script component.
 * Instances must never be stored in SceneData.
 */
export interface ScriptInstance {
  /** Optional per-frame hook; v1 host may not call this yet. */
  update?(dt: number): void;
  destroy?(): void;
}

/** Read-only 2D transform snapshot for script behaviours (no component id). */
export interface ScriptTransform2D {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
}

/** Partial patch applied by `setTransform2D` (merges into the live Transform2D). */
export interface ScriptTransform2DPatch {
  position?: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
}

/**
 * Frame / renderer metrics for overlays such as Performance Meter.
 * Host fills timing; draw/triangle/canvas may come from the active renderer.
 */
export interface ScriptPerformanceStats {
  frameTimeMs: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  gameLogicMs: number;
  rendererMs: number;
  canvas: number;
  displayObjects: number;
}

/** Services provided by GameRuntime / preview to script `create` factories. */
export interface ScriptRuntimeServices {
  bus: EventBus;
  /** Switch the active scene by file id (e.g. "main"). */
  changeScene: (sceneId: string) => void | Promise<void>;
  /**
   * Subscribe to a pointer click on a scene node (playback / preview).
   * Host must forward renderer hits via `GameRuntime.emitNodeClick`.
   * Prefer `onNodePointerEvent(..., "pointertap", …)` for new scripts.
   */
  onNodeClick?: (nodeId: string, handler: () => void) => () => void;
  /**
   * Subscribe to a playback pointer event on a scene node.
   * Host must forward via `GameRuntime.emitNodePointerEvent`.
   */
  onNodePointerEvent?: (
    nodeId: string,
    event: NodePointerEventName,
    handler: () => void,
  ) => () => void;
  /** Resolve a catalogue assetId to a fetchable URL (audio, textures, …). */
  resolveAssetUrl?: (assetId: string) => string | undefined;
  /**
   * Catalogue assetIds referenced by bundled scenes.
   * Used by Load All Scene Assets.
   */
  listAllSceneAssetIds?: () => readonly string[] | Promise<readonly string[]>;
  /**
   * Host preload (Pixi Assets / Three glTF cache / fetch).
   * Shared scripts must not import renderer packages.
   */
  preloadSceneAsset?: (
    assetId: string,
    signal?: AbortSignal,
  ) => Promise<void>;
  /** Play an audio catalogue asset by id (host owns HTMLAudioElement / decoder). */
  playAudio?: (assetId: string) => void;
  /** Read the host node's Transform2D (undefined if missing). */
  getTransform2D?: (nodeId: string) => ScriptTransform2D | undefined;
  /**
   * Patch Transform2D on a node and sync registered renderers.
   * Runtime-only; does not write scene files.
   */
  setTransform2D?: (nodeId: string, patch: ScriptTransform2DPatch) => void;
  /**
   * Set Text / HTMLText / BitmapText content on a node and sync renderers.
   * Runtime-only; does not write scene files.
   */
  setText?: (nodeId: string, text: string) => void;
  /** Latest frame performance snapshot (undefined when host has none yet). */
  getPerformanceStats?: () => ScriptPerformanceStats | undefined;
}

export interface ScriptCreateContext {
  nodeId: string;
  componentId: string;
  scriptId: string;
  properties: Readonly<Record<string, unknown>>;
  services: ScriptRuntimeServices;
}

export interface ComponentDefinition {
  /** Stable registry id, e.g. `shared.ChangeScene`. Never a filesystem path. */
  id: string;
  displayName: string;
  category: string;
  categoryOrder: number;
  order: number;
  /** When false (default), only one instance of this scriptId per node. */
  allowMultiple?: boolean;
  properties: Readonly<Record<string, ComponentPropertyDefinition>>;
  /**
   * Optional factory for runtime instances. Editor catalog does not require it.
   */
  create?(context: ScriptCreateContext): ScriptInstance;
}

export interface ComponentCategoryGroup {
  category: string;
  categoryOrder: number;
  definitions: ComponentDefinition[];
}

export type DefineComponentInput = ComponentDefinition;

/** Bus event catalog entry exported by a game for inspector dropdowns. */
export interface BusEventDefinition {
  id: string;
  label: string;
}
