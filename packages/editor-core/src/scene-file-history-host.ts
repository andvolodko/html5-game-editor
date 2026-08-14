import type { Command } from "@game-editor/commands";
import type { SceneData } from "@game-editor/scene";

/**
 * Disk + open-document mutations for undoable scene file rename/delete.
 * Implemented by Editor; commands must not call React or renderers.
 */
export interface SceneFileHistoryHost {
  renameSceneFileOnDisk(fromId: string, toId: string): Promise<void>;
  deleteSceneFileOnDisk(
    sceneId: string,
    fallbackSceneId: string,
    options: { preserveUndo: boolean },
  ): Promise<void>;
  restoreSceneFileOnDisk(
    sceneId: string,
    snapshot: SceneData,
    options: { open: boolean; restoreStartScene: boolean },
  ): Promise<void>;
}

export function isAsyncCommand(command: Command): boolean {
  return command.async === true;
}
