import {
  findNodeById,
  flattenNodes,
  flattenSubtree,
  getAncestorIds,
  getNodeVisible,
  type SceneData,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import type { EditorDocumentMode } from "./prefab-manager.js";

export const EDITOR_NODE_METADATA_VERSION = 1 as const;
export const EDITOR_NODE_METADATA_STORAGE_PREFIX = "game-editor:node-meta:v1";

/**
 * Per-node editor-only flags. Omitted keys default to false.
 * Designed to grow (expanded, favorite, …) without scene serialization.
 */
export interface EditorNodeState {
  hidden?: boolean;
  locked?: boolean;
}

export interface EditorSceneNodeMetadata {
  version: typeof EDITOR_NODE_METADATA_VERSION;
  nodes: Record<string, EditorNodeState>;
}

export interface EditorNodeMetadataStorage {
  load(key: string): EditorSceneNodeMetadata | undefined;
  save(key: string, value: EditorSceneNodeMetadata): void;
}

export function emptyEditorSceneNodeMetadata(): EditorSceneNodeMetadata {
  return { version: EDITOR_NODE_METADATA_VERSION, nodes: {} };
}

export function editorDocumentKey(mode: EditorDocumentMode): string {
  if (mode.kind === "prefab") {
    return `prefab:${mode.assetId}`;
  }
  return `scene:${mode.sceneFileId}`;
}

export function editorNodeMetadataStorageKey(
  projectId: string,
  documentKey: string,
): string {
  return `${EDITOR_NODE_METADATA_STORAGE_PREFIX}:${projectId}:${documentKey}`;
}

export function parseEditorSceneNodeMetadata(
  value: unknown,
): EditorSceneNodeMetadata | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as { version?: unknown; nodes?: unknown };
  if (record.version !== EDITOR_NODE_METADATA_VERSION) {
    return undefined;
  }
  if (typeof record.nodes !== "object" || record.nodes === null) {
    return undefined;
  }
  const nodes: Record<string, EditorNodeState> = {};
  for (const [nodeId, entry] of Object.entries(record.nodes)) {
    const parsed = parseEditorNodeState(entry);
    if (parsed) {
      nodes[nodeId] = parsed;
    }
  }
  return { version: EDITOR_NODE_METADATA_VERSION, nodes };
}

function parseEditorNodeState(value: unknown): EditorNodeState | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as { hidden?: unknown; locked?: unknown };
  const next: EditorNodeState = {};
  if (record.hidden === true) {
    next.hidden = true;
  }
  if (record.locked === true) {
    next.locked = true;
  }
  return next.hidden === true || next.locked === true ? next : undefined;
}

export function compactEditorNodeState(
  state: EditorNodeState,
): EditorNodeState | undefined {
  const next: EditorNodeState = {};
  if (state.hidden === true) {
    next.hidden = true;
  }
  if (state.locked === true) {
    next.locked = true;
  }
  return next.hidden === true || next.locked === true ? next : undefined;
}

export function isNodeHiddenInEditor(
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): boolean {
  return metadata.nodes[nodeId]?.hidden === true;
}

export function isNodeLocked(
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): boolean {
  return metadata.nodes[nodeId]?.locked === true;
}

export function sceneHasHiddenNodes(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
): boolean {
  return flattenNodes(scene).some((node) =>
    isNodeHiddenInEditor(metadata, node.id),
  );
}

export function sceneHasLockedNodes(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
): boolean {
  return flattenNodes(scene).some((node) => isNodeLocked(metadata, node.id));
}

export function isNodeEffectivelyHidden(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): boolean {
  if (isNodeHiddenInEditor(metadata, nodeId)) {
    return true;
  }
  return getAncestorIds(scene, nodeId).some((id) =>
    isNodeHiddenInEditor(metadata, id),
  );
}

export function isNodeEffectivelyVisible(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): boolean {
  return !isNodeEffectivelyHidden(scene, metadata, nodeId);
}

export function isNodeEffectivelyLocked(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): boolean {
  if (isNodeLocked(metadata, nodeId)) {
    return true;
  }
  return getAncestorIds(scene, nodeId).some((id) => isNodeLocked(metadata, id));
}

export function findHiddenAncestor(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): SceneNodeData | undefined {
  for (const ancestorId of getAncestorIds(scene, nodeId)) {
    if (isNodeHiddenInEditor(metadata, ancestorId)) {
      return findNodeById(scene, ancestorId);
    }
  }
  return undefined;
}

export function findLockedAncestor(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): SceneNodeData | undefined {
  for (const ancestorId of getAncestorIds(scene, nodeId)) {
    if (isNodeLocked(metadata, ancestorId)) {
      return findNodeById(scene, ancestorId);
    }
  }
  return undefined;
}

export interface EditorNodeFlags {
  ownHidden: boolean;
  effectivelyHidden: boolean;
  hiddenByAncestorName: string | undefined;
  ownLocked: boolean;
  effectivelyLocked: boolean;
  lockedByAncestorName: string | undefined;
}

export function getEditorNodeFlags(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  nodeId: string,
): EditorNodeFlags {
  const ownHidden = isNodeHiddenInEditor(metadata, nodeId);
  const ownLocked = isNodeLocked(metadata, nodeId);
  const hiddenAncestor = ownHidden
    ? undefined
    : findHiddenAncestor(scene, metadata, nodeId);
  const lockedAncestor = ownLocked
    ? undefined
    : findLockedAncestor(scene, metadata, nodeId);
  return {
    ownHidden,
    effectivelyHidden: ownHidden || hiddenAncestor !== undefined,
    hiddenByAncestorName: hiddenAncestor?.name,
    ownLocked,
    effectivelyLocked: ownLocked || lockedAncestor !== undefined,
    lockedByAncestorName: lockedAncestor?.name,
  };
}

export function descendantNodeIds(
  scene: SceneData,
  nodeId: string,
): string[] {
  const node = findNodeById(scene, nodeId);
  if (!node) {
    return [];
  }
  return flattenSubtree(node)
    .slice(1)
    .map((entry) => entry.id);
}

export function subtreeNodeIds(scene: SceneData, nodeId: string): string[] {
  const node = findNodeById(scene, nodeId);
  if (!node) {
    return [];
  }
  return flattenSubtree(node).map((entry) => entry.id);
}

/**
 * Apply editor overlay flags to renderer objects without rebuilding the graph.
 * Editor hide uses each node's *own* hidden flag so Pixi/Three parent visibility
 * hides descendants without overwriting their stored state.
 * Display visibility is `getNodeVisible(node) && !editorHidden`.
 * Lock uses effective (inherited) lock so gizmos/drags skip the whole subtree.
 */
export function applyEditorNodeOverlay(
  renderer: SceneRenderer,
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
): void {
  for (const node of flattenNodes(scene)) {
    const editorHidden = isNodeHiddenInEditor(metadata, node.id);
    if (renderer.setNodeEditorHidden) {
      renderer.setNodeEditorHidden(node.id, editorHidden);
    } else {
      renderer.setNodeVisible?.(
        node.id,
        getNodeVisible(node) && !editorHidden,
      );
    }
    renderer.setNodeLocked?.(
      node.id,
      isNodeEffectivelyLocked(scene, metadata, node.id),
    );
  }
}

export function createMemoryEditorNodeMetadataStorage(): EditorNodeMetadataStorage {
  const data = new Map<string, string>();
  return {
    load(key) {
      const raw = data.get(key);
      if (!raw) {
        return undefined;
      }
      try {
        return parseEditorSceneNodeMetadata(JSON.parse(raw) as unknown);
      } catch {
        return undefined;
      }
    },
    save(key, value) {
      data.set(key, JSON.stringify(value));
    },
  };
}

export function createLocalStorageEditorNodeMetadataStorage(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = tryLocalStorage(),
): EditorNodeMetadataStorage {
  return {
    load(key) {
      if (!storage) {
        return undefined;
      }
      try {
        const raw = storage.getItem(key);
        if (!raw) {
          return undefined;
        }
        return parseEditorSceneNodeMetadata(JSON.parse(raw) as unknown);
      } catch {
        return undefined;
      }
    },
    save(key, value) {
      if (!storage) {
        return;
      }
      storage.setItem(key, JSON.stringify(value));
    },
  };
}

function tryLocalStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Hierarchy drop is invalid when it would move a locked node or mutate a
 * locked parent's child list (drop inside, or reorder under that parent).
 */
export function isHierarchyDropBlockedByLock(
  scene: SceneData,
  metadata: EditorSceneNodeMetadata,
  input: {
    draggedIds: readonly string[];
    targetId?: string;
    placement: "before" | "inside" | "after" | "root";
  },
): boolean {
  if (
    input.draggedIds.some((id) => isNodeEffectivelyLocked(scene, metadata, id))
  ) {
    return true;
  }
  if (input.placement === "root" || input.targetId === undefined) {
    return false;
  }
  if (input.placement === "inside") {
    return isNodeEffectivelyLocked(scene, metadata, input.targetId);
  }
  const target = findNodeById(scene, input.targetId);
  const parentId = target?.parentId;
  if (parentId === undefined) {
    return false;
  }
  return isNodeEffectivelyLocked(scene, metadata, parentId);
}
