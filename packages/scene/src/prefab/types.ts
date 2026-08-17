import type { SceneNodeData } from "../types.js";

/** Current prefab document schema version. Bump when persisted shape changes incompatibly. */
export const PREFAB_SCHEMA_VERSION = 1 as const;

/** Guard against runaway nested prefab expansion. */
export const PREFAB_MAX_NESTING_DEPTH = 16;

export interface PrefabPropertyOverride {
  kind: "property";
  sourceNodeId: string;
  /** Prefab-source component id (not the scene instance component id). */
  componentId: string;
  propertyPath: string;
  value: unknown;
}

export interface PrefabNameOverride {
  kind: "name";
  sourceNodeId: string;
  value: string;
}

export interface PrefabLayerOverride {
  kind: "layer";
  sourceNodeId: string;
  value: "background" | "foreground";
}

export interface PrefabVisibleOverride {
  kind: "visible";
  sourceNodeId: string;
  value: boolean;
}

export type PrefabOverride =
  | PrefabPropertyOverride
  | PrefabNameOverride
  | PrefabLayerOverride
  | PrefabVisibleOverride;

/**
 * Persistent link from a scene node to a prefab source node.
 * Present only on nodes that belong to a prefab instance.
 */
export interface PrefabInstanceLink {
  /** Catalogue assetId of the prefab. Never a filesystem path. */
  prefabAssetId: string;
  /** Shared by every inherited node of this instance. */
  instanceId: string;
  /** Node id inside the prefab document. */
  sourceNodeId: string;
  /** Scene component id → prefab source component id. */
  componentSources: Record<string, string>;
  /** True only on the instance root. */
  isRoot?: boolean;
  /** Fine-grained overrides. Stored only on the instance root. */
  overrides?: PrefabOverride[];
}

/**
 * Versioned, engine-neutral prefab document.
 * `root` reuses the same serializable node/component structures as scenes.
 */
export interface PrefabData {
  version: number;
  id: string;
  name: string;
  root: SceneNodeData;
}

export type PrefabCatalog = ReadonlyMap<string, PrefabData>;

export type PrefabResolveWarningCode =
  | "MISSING_PREFAB"
  | "PREFAB_CYCLE"
  | "PREFAB_DEPTH";

export interface PrefabResolveWarning {
  code: PrefabResolveWarningCode;
  prefabAssetId: string;
  message: string;
}

export interface PrefabResolveResult {
  node: SceneNodeData;
  missing: boolean;
  warnings: PrefabResolveWarning[];
}
