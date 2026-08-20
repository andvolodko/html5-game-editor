import type { Vec2 } from "../types.js";

/**
 * Implicit Base state. Never stored in scene JSON — Base is the node's
 * normal Transform2D / alpha / visible fields.
 */
export const BASE_NODE_STATE_ID = null;

export type NodeStateId = string;

/** Optional editor viewport hint for a named state (preview only). */
export interface NodeStateViewport {
  width: number;
  height: number;
}

/**
 * Scene-level named state catalog entry.
 * `id` is stable (`state_…`); `name` is display-only.
 */
export interface SceneStateDefinition {
  id: NodeStateId;
  name: string;
  viewport?: NodeStateViewport;
}

/** Sparse Transform2D channels overridden by a named state. */
export interface NodeStateTransform2DOverrides {
  position?: { x?: number; y?: number };
  rotation?: number;
  scale?: { x?: number; y?: number };
}

/**
 * Sparse property overrides for one named state on one node.
 * Omitted keys inherit Base. Empty objects must be pruned before save.
 */
export interface NodeStateOverrides {
  visible?: boolean;
  alpha?: number;
  transform2D?: NodeStateTransform2DOverrides;
}

/**
 * Per-node map of catalog state id → sparse overrides.
 * Omit the field when empty.
 */
export type NodeStateOverridesMap = Record<NodeStateId, NodeStateOverrides>;

/** Closed MVP property paths supported by the resolver / editor. */
export const NODE_STATE_PROPERTY_PATHS = [
  "visible",
  "alpha",
  "transform2D.position.x",
  "transform2D.position.y",
  "transform2D.rotation",
  "transform2D.scale.x",
  "transform2D.scale.y",
] as const;

export type NodeStatePropertyPath = (typeof NODE_STATE_PROPERTY_PATHS)[number];

/** Fully resolved display values for editor / runtime overlay. */
export interface ResolvedNodeState {
  visible: boolean;
  alpha: number;
  transform2D: {
    position: Vec2;
    rotation: number;
    scale: Vec2;
  } | undefined;
}
