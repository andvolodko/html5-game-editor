import { flattenNodes, type SceneData } from "@game-editor/scene";
import type { EditorDocumentMode } from "./prefab-manager.js";
import {
  compactEditorNodeState,
  createLocalStorageEditorNodeMetadataStorage,
  editorDocumentKey,
  editorNodeMetadataStorageKey,
  emptyEditorSceneNodeMetadata,
  type EditorNodeMetadataStorage,
  type EditorNodeState,
  type EditorSceneNodeMetadata,
} from "./editor-node-metadata.js";

type Listener = () => void;

/**
 * In-memory editor-only node flags for the open document, persisted per
 * project + scene/prefab. Not part of the scene undo stack or scene JSON.
 */
export class EditorNodeMetadataStore {
  private snapshot: EditorSceneNodeMetadata = emptyEditorSceneNodeMetadata();
  private scopeKey: string | undefined;
  private revision = 0;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly storage: EditorNodeMetadataStorage = createLocalStorageEditorNodeMetadataStorage(),
  ) {}

  getRevision(): number {
    return this.revision;
  }

  getSnapshot(): EditorSceneNodeMetadata {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  bindScope(projectId: string, mode: EditorDocumentMode): void {
    const nextKey = editorNodeMetadataStorageKey(
      projectId,
      editorDocumentKey(mode),
    );
    if (nextKey === this.scopeKey) {
      return;
    }
    this.persist();
    this.scopeKey = nextKey;
    this.snapshot =
      this.storage.load(nextKey) ?? emptyEditorSceneNodeMetadata();
    this.revision += 1;
    this.emit();
  }

  persist(): void {
    if (this.scopeKey === undefined) {
      return;
    }
    this.storage.save(this.scopeKey, this.snapshot);
  }

  getNodeState(nodeId: string): EditorNodeState {
    return this.snapshot.nodes[nodeId] ?? {};
  }

  setHidden(nodeIds: readonly string[], hidden: boolean): void {
    this.patchNodes(nodeIds, { hidden });
  }

  setLocked(nodeIds: readonly string[], locked: boolean): void {
    this.patchNodes(nodeIds, { locked });
  }

  showAll(scene: SceneData): void {
    this.setFlagForAll(scene, "hidden", false);
  }

  hideAll(scene: SceneData): void {
    this.setFlagForAll(scene, "hidden", true);
  }

  lockAll(scene: SceneData): void {
    this.setFlagForAll(scene, "locked", true);
  }

  unlockAll(scene: SceneData): void {
    this.setFlagForAll(scene, "locked", false);
  }

  pruneMissing(scene: SceneData): void {
    const live = new Set(flattenNodes(scene).map((node) => node.id));
    let changed = false;
    const next = { ...this.snapshot.nodes };
    for (const id of Object.keys(next)) {
      if (!live.has(id)) {
        delete next[id];
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    this.snapshot = { ...this.snapshot, nodes: next };
    this.revision += 1;
    this.persist();
    this.emit();
  }

  removeNode(nodeId: string): void {
    if (this.snapshot.nodes[nodeId] === undefined) {
      return;
    }
    const next = { ...this.snapshot.nodes };
    delete next[nodeId];
    this.snapshot = { ...this.snapshot, nodes: next };
    this.revision += 1;
    this.persist();
    this.emit();
  }

  private setFlagForAll(
    scene: SceneData,
    flag: "hidden" | "locked",
    value: boolean,
  ): void {
    this.patchNodes(
      flattenNodes(scene).map((node) => node.id),
      { [flag]: value },
    );
  }

  private patchNodes(
    nodeIds: readonly string[],
    patch: EditorNodeState,
  ): void {
    if (nodeIds.length === 0) {
      return;
    }
    let changed = false;
    const next = { ...this.snapshot.nodes };
    for (const nodeId of nodeIds) {
      const current = next[nodeId] ?? {};
      const merged: EditorNodeState = {
        ...current,
        ...patch,
      };
      const compact = compactEditorNodeState(merged);
      const previous = next[nodeId];
      if (compact === undefined) {
        if (previous !== undefined) {
          delete next[nodeId];
          changed = true;
        }
        continue;
      }
      if (previous?.hidden !== compact.hidden || previous?.locked !== compact.locked) {
        next[nodeId] = compact;
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    this.snapshot = { ...this.snapshot, nodes: next };
    this.revision += 1;
    this.persist();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
