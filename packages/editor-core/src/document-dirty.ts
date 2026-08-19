import type { SceneData } from "@game-editor/scene";

export type DocumentDirtyState = "clean" | "dirty" | "saving" | "save-error";

export interface DocumentContentSnapshot {
  scene: SceneData;
  savedSnapshot: string;
  dirtyState: DocumentDirtyState;
  saveError: string | undefined;
}

/** True when leaving/reloading the document would discard unpersisted edits. */
export function hasUnsavedChanges(state: DocumentDirtyState): boolean {
  return state === "dirty" || state === "save-error";
}

export function stableSceneSnapshot(scene: SceneData): string {
  return JSON.stringify(scene);
}

/**
 * Saved-snapshot comparison and save-lifecycle flags for DocumentManager.
 * Scene tree ownership stays on DocumentManager.
 */
export class DocumentDirtyTracker {
  savedSnapshot: string;
  dirtyState: DocumentDirtyState = "clean";
  saveError: string | undefined;

  constructor(scene: SceneData) {
    this.savedSnapshot = stableSceneSnapshot(scene);
  }

  capture(scene: SceneData): DocumentContentSnapshot {
    return {
      scene: JSON.parse(JSON.stringify(scene)) as SceneData,
      savedSnapshot: this.savedSnapshot,
      dirtyState: this.dirtyState,
      saveError: this.saveError,
    };
  }

  restore(snapshot: DocumentContentSnapshot): void {
    this.savedSnapshot = snapshot.savedSnapshot;
    this.dirtyState = snapshot.dirtyState;
    this.saveError = snapshot.saveError;
  }

  markClean(scene: SceneData): void {
    this.savedSnapshot = stableSceneSnapshot(scene);
    this.dirtyState = "clean";
    this.saveError = undefined;
  }

  beginSave(): void {
    this.dirtyState = "saving";
    this.saveError = undefined;
  }

  failSave(message: string): void {
    this.dirtyState = "save-error";
    this.saveError = message;
  }

  markDirtyUnlessSaving(): void {
    if (this.dirtyState !== "saving") {
      this.dirtyState = "dirty";
      this.saveError = undefined;
    }
  }

  /**
   * Recompute dirty by comparing current scene to last saved snapshot.
   * Returns false when a save is in flight (caller should skip emit).
   */
  syncFromContent(scene: SceneData): boolean {
    if (this.dirtyState === "saving") {
      return false;
    }
    const matches = stableSceneSnapshot(scene) === this.savedSnapshot;
    this.dirtyState = matches ? "clean" : "dirty";
    if (matches) {
      this.saveError = undefined;
    }
    return true;
  }
}
