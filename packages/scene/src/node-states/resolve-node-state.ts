import {
  IDENTITY_POSITION_2D,
  IDENTITY_ROTATION_2D,
  IDENTITY_SCALE_2D,
} from "../defaults.js";
import { getNodeAlpha } from "../node-alpha.js";
import { getNodeVisible } from "../node-visibility.js";
import {
  deleteValueAtPath,
  getValueAtPath,
  isPlainObject,
  setValueAtPath,
} from "../prefab/property-path.js";
import { getTransform2D } from "../queries.js";
import type { SceneNodeData, Transform2DComponentData, Vec2 } from "../types.js";
import {
  BASE_NODE_STATE_ID,
  type NodeStateId,
  type NodeStateOverrides,
  type NodeStateOverridesMap,
  type NodeStatePropertyPath,
  type NodeStateTransform2DOverrides,
  type ResolvedNodeState,
} from "./types.js";

function cloneVec2(value: Vec2): Vec2 {
  return { x: value.x, y: value.y };
}

function baseTransform2D(
  transform: Transform2DComponentData | undefined,
): ResolvedNodeState["transform2D"] {
  if (!transform) {
    return undefined;
  }
  return {
    position: cloneVec2(transform.position),
    rotation: transform.rotation,
    scale: cloneVec2(transform.scale),
  };
}

/** Read sparse overrides for a catalog state id, or undefined when Base / missing. */
export function getNodeStateOverrides(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): NodeStateOverrides | undefined {
  if (stateId === BASE_NODE_STATE_ID) {
    return undefined;
  }
  return node.stateOverrides?.[stateId];
}

export function isNodeStatePropertyOverridden(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
  path: NodeStatePropertyPath,
): boolean {
  const overrides = getNodeStateOverrides(node, stateId);
  if (!overrides) {
    return false;
  }
  return getValueAtPath(overrides, path) !== undefined;
}

/**
 * Resolve effective display values: Base node fields, then one active state.
 * Always re-resolve from Base (never forward-only mutate) so stale channels
 * from a previous state are restored when switching.
 */
export function resolveNodeState(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID = BASE_NODE_STATE_ID,
): ResolvedNodeState {
  const baseTransform = getTransform2D(node);
  const resolved: ResolvedNodeState = {
    visible: getNodeVisible(node),
    alpha: getNodeAlpha(node),
    transform2D: baseTransform2D(baseTransform),
  };

  const overrides = getNodeStateOverrides(node, stateId);
  if (!overrides) {
    return resolved;
  }

  if (overrides.visible !== undefined) {
    resolved.visible = overrides.visible;
  }
  if (overrides.alpha !== undefined) {
    resolved.alpha = overrides.alpha;
  }

  if (overrides.transform2D && resolved.transform2D) {
    const t = overrides.transform2D;
    if (t.position?.x !== undefined) {
      resolved.transform2D.position.x = t.position.x;
    }
    if (t.position?.y !== undefined) {
      resolved.transform2D.position.y = t.position.y;
    }
    if (t.rotation !== undefined) {
      resolved.transform2D.rotation = t.rotation;
    }
    if (t.scale?.x !== undefined) {
      resolved.transform2D.scale.x = t.scale.x;
    }
    if (t.scale?.y !== undefined) {
      resolved.transform2D.scale.y = t.scale.y;
    }
  }

  return resolved;
}

function isEmptyObject(value: Record<string, unknown>): boolean {
  return Object.keys(value).length === 0;
}

/** Remove empty nested objects and empty map entries. Mutates `node`. */
export function pruneNodeStateOverrides(node: SceneNodeData): void {
  const map = node.stateOverrides;
  if (!map) {
    return;
  }
  for (const stateId of Object.keys(map)) {
    const entry = map[stateId];
    if (!entry) {
      delete map[stateId];
      continue;
    }
    if (entry.transform2D) {
      const t = entry.transform2D as Record<string, unknown>;
      if (isPlainObject(t.position) && isEmptyObject(t.position as Record<string, unknown>)) {
        delete t.position;
      }
      if (isPlainObject(t.scale) && isEmptyObject(t.scale as Record<string, unknown>)) {
        delete t.scale;
      }
      if (isEmptyObject(t)) {
        delete entry.transform2D;
      }
    }
    if (isEmptyObject(entry as Record<string, unknown>)) {
      delete map[stateId];
    }
  }
  if (isEmptyObject(map)) {
    delete node.stateOverrides;
  }
}

/**
 * Diff a full effective Transform2D pose against Base; return only channels
 * that differ so unchanged axes stay inherited.
 */
export function diffTransform2DOverride(
  base: Transform2DComponentData | undefined,
  next: {
    position?: Vec2;
    rotation?: number;
    scale?: Vec2;
  },
): NodeStateTransform2DOverrides | undefined {
  const basePosition = base?.position ?? IDENTITY_POSITION_2D;
  const baseRotation = base?.rotation ?? IDENTITY_ROTATION_2D;
  const baseScale = base?.scale ?? IDENTITY_SCALE_2D;
  const result: NodeStateTransform2DOverrides = {};

  if (next.position !== undefined) {
    const position: { x?: number; y?: number } = {};
    if (next.position.x !== basePosition.x) {
      position.x = next.position.x;
    }
    if (next.position.y !== basePosition.y) {
      position.y = next.position.y;
    }
    if (Object.keys(position).length > 0) {
      result.position = position;
    }
  }

  if (next.rotation !== undefined && next.rotation !== baseRotation) {
    result.rotation = next.rotation;
  }

  if (next.scale !== undefined) {
    const scale: { x?: number; y?: number } = {};
    if (next.scale.x !== baseScale.x) {
      scale.x = next.scale.x;
    }
    if (next.scale.y !== baseScale.y) {
      scale.y = next.scale.y;
    }
    if (Object.keys(scale).length > 0) {
      result.scale = scale;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Merge a sparse patch into an existing override object (deep for transform).
 * Does not prune — call `pruneNodeStateOverrides` after writing to the node.
 */
export function mergeNodeStateOverrides(
  existing: NodeStateOverrides | undefined,
  patch: NodeStateOverrides,
): NodeStateOverrides {
  const next: NodeStateOverrides = existing
    ? (JSON.parse(JSON.stringify(existing)) as NodeStateOverrides)
    : {};

  if (patch.visible !== undefined) {
    next.visible = patch.visible;
  }
  if (patch.alpha !== undefined) {
    next.alpha = patch.alpha;
  }
  if (patch.transform2D !== undefined) {
    const t = next.transform2D ?? {};
    const p = patch.transform2D;
    if (p.position !== undefined) {
      t.position = { ...t.position, ...p.position };
    }
    if (p.rotation !== undefined) {
      t.rotation = p.rotation;
    }
    if (p.scale !== undefined) {
      t.scale = { ...t.scale, ...p.scale };
    }
    next.transform2D = t;
  }
  return next;
}

/** Set one property path on a sparse override object. */
export function setNodeStatePropertyOverride(
  overrides: NodeStateOverrides,
  path: NodeStatePropertyPath,
  value: unknown,
): void {
  setValueAtPath(overrides as Record<string, unknown>, path, value);
}

/** Remove one property path; caller must prune empty parents. */
export function resetNodeStateProperty(
  overrides: NodeStateOverrides,
  path: NodeStatePropertyPath,
): void {
  deleteValueAtPath(overrides as Record<string, unknown>, path);
}

/**
 * Write (or replace) the override bag for one state on a node, then prune.
 * Pass `undefined` overrides to clear that state entry.
 */
export function applyNodeStateOverridesMapEntry(
  node: SceneNodeData,
  stateId: NodeStateId,
  overrides: NodeStateOverrides | undefined,
): void {
  if (overrides === undefined) {
    if (node.stateOverrides) {
      delete node.stateOverrides[stateId];
      pruneNodeStateOverrides(node);
    }
    return;
  }
  const map: NodeStateOverridesMap = node.stateOverrides ?? {};
  map[stateId] = overrides;
  node.stateOverrides = map;
  pruneNodeStateOverrides(node);
}

/** Deep-clone stateOverrides for duplicate / prefab clone paths. */
export function copyNodeStateOverrides(
  source: SceneNodeData,
  target: SceneNodeData,
): void {
  if (source.stateOverrides === undefined) {
    return;
  }
  target.stateOverrides = JSON.parse(
    JSON.stringify(source.stateOverrides),
  ) as NodeStateOverridesMap;
}

/** True when any node in the tree has an override for `stateId`. */
export function nodeHasStateOverride(
  node: SceneNodeData,
  stateId: NodeStateId,
): boolean {
  return node.stateOverrides?.[stateId] !== undefined;
}
