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
export const COMPONENT_ASSET_TYPES = [
  "texture",
  "spine",
  "audio",
  "gltf",
  "aseprite",
] as const;

export type ComponentAssetType = (typeof COMPONENT_ASSET_TYPES)[number];

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
 * - gltfAnimations: clip names on the host node's Model3D glTF asset
 */
export type DynamicEnumSource = "scenes" | "busEvents" | "gltfAnimations";

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

/** Read-only 3D transform snapshot for script behaviours (no component id). */
export interface ScriptTransform3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/** Partial patch applied by `setTransform3D` (merges into the live Transform3D). */
export interface ScriptTransform3DPatch {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}

/** Live Model3D playback fields for scripts (no THREE objects). */
export interface ScriptModel3DPlayback {
  assetId?: string;
  animation?: string;
  loop: boolean;
  timeScale: number;
  playing: boolean;
}

/** Partial patch applied by `setModel3DPlayback`. */
export interface ScriptModel3DPlaybackPatch {
  animation?: string;
  loop?: boolean;
  timeScale?: number;
  playing?: boolean;
}

/** Per-renderer GPU / graph counters (Pixi or Three). */
export interface ScriptRendererDrawStats {
  drawCalls: number;
  triangles: number;
  canvas: number;
  displayObjects: number;
}

/**
 * Frame / renderer metrics for overlays such as Performance Meter.
 * Host fills timing; draw/triangle/canvas may come from the active renderer.
 * `pixi` / `three` are set when that renderer is registered.
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
  pixi?: ScriptRendererDrawStats;
  three?: ScriptRendererDrawStats;
}

/** Options for `playAudio` (SFX one-shot vs looping BGM). */
export interface PlayAudioOptions {
  loop?: boolean;
  /** Linear gain in 0–1. */
  volume?: number;
}

/** Runtime-only Model3D spawn (not persisted to scene files). */
export interface ScriptSpawnModel3DOptions {
  assetId: string;
  name?: string;
  parentId?: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}

/** Immediate child of a scene node, for script lookups by name. */
export interface ScriptChildNodeRef {
  id: string;
  name: string;
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
  playAudio?: (assetId: string, options?: PlayAudioOptions) => void;
  /** Stop looping audio started via `playAudio`. Omit `assetId` to stop all. */
  stopAudio?: (assetId?: string) => void;
  /** Read the host node's Transform2D (undefined if missing). */
  getTransform2D?: (nodeId: string) => ScriptTransform2D | undefined;
  /**
   * Patch Transform2D on a node and sync registered renderers.
   * Runtime-only; does not write scene files.
   */
  setTransform2D?: (nodeId: string, patch: ScriptTransform2DPatch) => void;
  /** Read the host node's Transform3D (undefined if missing). */
  getTransform3D?: (nodeId: string) => ScriptTransform3D | undefined;
  /**
   * Patch Transform3D on a node and sync registered renderers.
   * Runtime-only; does not write scene files.
   */
  setTransform3D?: (nodeId: string, patch: ScriptTransform3DPatch) => void;
  /** Read Model3D playback on a node (undefined if missing). */
  getModel3DPlayback?: (nodeId: string) => ScriptModel3DPlayback | undefined;
  /**
   * Patch Model3D clip / loop / playing and sync registered renderers.
   * Runtime-only; does not write scene files.
   */
  setModel3DPlayback?: (
    nodeId: string,
    patch: ScriptModel3DPlaybackPatch,
  ) => void;
  /** Clip names on the node's current glTF asset (empty until the host has loaded it). */
  listModel3DAnimations?: (nodeId: string) => readonly string[];
  /**
   * Authored clip length in seconds (before `timeScale`).
   * Undefined when the host has not loaded the asset.
   */
  getModel3DAnimationDuration?: (
    nodeId: string,
    animation?: string,
  ) => number | undefined;
  /**
   * Set Text / HTMLText / BitmapText content on a node and sync renderers.
   * Runtime-only; does not write scene files.
   */
  setText?: (nodeId: string, text: string) => void;
  /** Latest frame performance snapshot (undefined when host has none yet). */
  getPerformanceStats?: () => ScriptPerformanceStats | undefined;
  /**
   * World-space pose of a named glTF bone on a Model3D node.
   * Undefined until the host has loaded the skinned mesh.
   */
  getModel3DBoneWorldTransform?: (
    nodeId: string,
    boneName: string,
  ) => ScriptTransform3D | undefined;
  /**
   * Insert a Model3D node into the live scene and sync renderers.
   * Runtime-only; does not write scene files. Returns the new node id.
   */
  spawnModel3D?: (options: ScriptSpawnModel3DOptions) => string | undefined;
  /**
   * Clone an authored scene node (and subtree) by name. 2D/3D.
   * Strips Script components. Runtime-only; does not write scene files.
   * `index` offsets the clone from the source in a grid.
   * `columns` is how many clones sit on one X row before wrapping (default 15).
   */
  cloneNodeByName?: (
    sourceName: string,
    index: number,
    columns?: number,
  ) => string | undefined;
  /**
   * Remove a node previously created by `spawnModel3D`.
   * No-op for authored scene nodes.
   */
  destroyNode?: (nodeId: string) => void;
  /** Immediate children of a node (empty when missing). */
  listChildNodes?: (nodeId: string) => readonly ScriptChildNodeRef[];
  /**
   * Show or hide a node's runtime object. Does not persist to scene files.
   */
  setNodeVisible?: (nodeId: string, visible: boolean) => void;
  /**
   * CSS cursor on a node's runtime object (e.g. `pointer`). Pixi playback.
   */
  setNodeCursor?: (nodeId: string, cursor: string) => void;
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
