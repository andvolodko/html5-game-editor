import type { AssetRecord } from "@game-editor/assets";
import { parseSceneData } from "@game-editor/scene";
import type { Editor } from "./editor.js";
import type { AssetHistoryHost } from "./asset-history-host.js";
import type { SceneFileHistoryHost } from "./scene-file-history-host.js";
import type { SceneListEntry } from "./scene-api-client.js";
import {
  DeleteAssetCommand,
  DeleteAssetFolderCommand,
  DeleteSceneFileCommand,
  DuplicateAssetCommand,
  RenameAssetCommand,
  RenameAssetFolderCommand,
  RenameSceneFileCommand,
} from "./commands/index.js";
import {
  deleteSceneDocumentFile,
  renameSceneDocumentFile,
  type ScenePersistenceHost,
} from "./editor-scene-persistence.js";

export async function editorRenameSceneFile(
  editor: Editor,
  persistence: ScenePersistenceHost,
  history: SceneFileHistoryHost,
  sceneFileId: string,
  newSceneFileId: string,
): Promise<SceneListEntry> {
  const entry = await renameSceneDocumentFile(
    persistence,
    sceneFileId,
    newSceneFileId,
  );
  if (sceneFileId !== entry.id) {
    editor.commands.record(
      new RenameSceneFileCommand(history, sceneFileId, entry.id),
    );
  }
  return entry;
}

export async function editorDeleteSceneFile(
  editor: Editor,
  persistence: ScenePersistenceHost,
  history: SceneFileHistoryHost,
  sceneFileId: string,
  fallbackSceneId: string,
): Promise<void> {
  const api = persistence.getSceneApi();
  if (!api) {
    throw new Error("Scene API client is not configured");
  }
  const wasActive = persistence.getSceneFileId() === sceneFileId;
  const snapshot = wasActive
    ? structuredClone(editor.document.getScene())
    : parseSceneData(await api.loadScene(sceneFileId));
  const wasStartScene = editor.project.getProject()?.startScene === sceneFileId;
  await deleteSceneDocumentFile(persistence, sceneFileId, fallbackSceneId);
  editor.commands.record(
    new DeleteSceneFileCommand(
      history,
      sceneFileId,
      snapshot,
      fallbackSceneId,
      wasActive,
      wasStartScene,
    ),
  );
}

export async function editorRenameAsset(
  editor: Editor,
  history: AssetHistoryHost,
  assetId: string,
  name: string,
): Promise<AssetRecord> {
  const before = editor.assets.get(assetId);
  const asset = await editor.assets.renameAsset(assetId, name);
  if (before && before.name !== asset.name) {
    editor.commands.record(
      new RenameAssetCommand(history, assetId, before.name, asset.name),
    );
  }
  return asset;
}

export async function editorDeleteAsset(
  editor: Editor,
  history: AssetHistoryHost,
  assetId: string,
): Promise<void> {
  await editor.assets.deleteAsset(assetId);
  editor.commands.record(new DeleteAssetCommand(history, assetId));
}

export async function editorDuplicateAsset(
  editor: Editor,
  history: AssetHistoryHost,
  assetId: string,
  destinationFolder?: string,
): Promise<AssetRecord> {
  const created = await editor.assets.duplicateAsset(assetId, destinationFolder);
  editor.commands.record(new DuplicateAssetCommand(history, created.id));
  return created;
}

export async function editorRenameFolder(
  editor: Editor,
  history: AssetHistoryHost,
  folderPath: string,
  name: string,
): Promise<string> {
  const next = await editor.assets.renameFolder(folderPath, name);
  if (next !== folderPath) {
    editor.commands.record(
      new RenameAssetFolderCommand(history, folderPath, next),
    );
  }
  return next;
}

export async function editorDeleteFolder(
  editor: Editor,
  history: AssetHistoryHost,
  folderPath: string,
): Promise<void> {
  await editor.assets.deleteFolder(folderPath);
  editor.commands.record(new DeleteAssetFolderCommand(history, folderPath));
}
