import { createId } from "@game-editor/shared";
import {
  allocateDuplicateName,
  parseSceneData,
  type SceneData,
} from "@game-editor/scene";
import { SCENES_FOLDER } from "./asset-browser-model.js";
import type { DocumentManager } from "./document-manager.js";
import type { SceneApiClient, SceneListEntry } from "./scene-api-client.js";
import { allocateSceneFileId } from "./scene-api-client.js";

export interface ScenePersistenceHost {
  getSceneApi(): SceneApiClient | undefined;
  getSceneFileId(): string;
  setSceneFileId(id: string): void;
  document: DocumentManager;
  setScene(scene: SceneData, options?: { preserveUndo?: boolean }): void;
  emit(): void;
  onSceneOpened(sceneFileId: string, sceneName: string): void;
  syncProjectAfterSceneFileChange(): Promise<void>;
  restoreStartScene(sceneId: string): Promise<void>;
}

function requireSceneApi(host: ScenePersistenceHost): SceneApiClient {
  const api = host.getSceneApi();
  if (!api) {
    throw new Error("Scene API client is not configured");
  }
  return api;
}

export async function saveSceneDocument(
  host: ScenePersistenceHost,
  sceneFileId = host.getSceneFileId(),
): Promise<void> {
  const sceneApi = requireSceneApi(host);
  host.setSceneFileId(sceneFileId);
  host.document.beginSave();
  host.emit();
  try {
    const saved = await sceneApi.saveScene(
      sceneFileId,
      host.document.getScene(),
    );
    const validated = parseSceneData(saved);
    host.document.markSaved(validated);
    host.emit();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    host.document.failSave(message);
    host.emit();
    throw error;
  }
}

export async function loadSceneDocument(
  host: ScenePersistenceHost,
  sceneFileId = host.getSceneFileId(),
  options?: { preserveUndo?: boolean },
): Promise<void> {
  const sceneApi = requireSceneApi(host);
  host.setSceneFileId(sceneFileId);
  const loaded = await sceneApi.loadScene(sceneFileId);
  const scene = parseSceneData(loaded);
  host.setScene(scene, options);
  host.onSceneOpened(sceneFileId, scene.name);
}

export async function listSceneDocuments(
  host: ScenePersistenceHost,
): Promise<SceneListEntry[]> {
  return requireSceneApi(host).listScenes();
}

export async function allocateSceneDocumentId(
  host: ScenePersistenceHost,
  base = "untitled",
): Promise<string> {
  const existing = await listSceneDocuments(host);
  return allocateSceneFileId(existing, base);
}

export async function createSceneDocument(
  host: ScenePersistenceHost,
  sceneFileId: string,
  name?: string,
): Promise<void> {
  await requireSceneApi(host).createScene(sceneFileId, name);
  await loadSceneDocument(host, sceneFileId);
}

/**
 * Copies a scene file to a unique id. Does not switch the active document.
 * The open scene (including unsaved edits) is the source when duplicating it.
 */
export async function duplicateSceneDocument(
  host: ScenePersistenceHost,
  sourceSceneId: string,
): Promise<SceneListEntry> {
  const api = requireSceneApi(host);
  const existing = await api.listScenes();
  const isActive = host.getSceneFileId() === sourceSceneId;
  if (!isActive && !existing.some((entry) => entry.id === sourceSceneId)) {
    throw new Error(`Scene not found: ${sourceSceneId}`);
  }
  const newId = allocateSceneFileId(existing, sourceSceneId);
  const source = isActive
    ? host.document.getScene()
    : parseSceneData(await api.loadScene(sourceSceneId));
  const copy: SceneData = {
    ...structuredClone(source),
    id: createId("scene"),
    name: allocateDuplicateName(source.name, [source.name]),
  };
  await api.saveScene(newId, copy);
  host.emit();
  return { id: newId, path: `${SCENES_FOLDER}/${newId}.json` };
}

export async function renameSceneDocumentFile(
  host: ScenePersistenceHost,
  sceneFileId: string,
  newSceneFileId: string,
): Promise<SceneListEntry> {
  const entry = await requireSceneApi(host).renameScene(
    sceneFileId,
    newSceneFileId,
  );
  if (host.getSceneFileId() === sceneFileId) {
    host.setSceneFileId(entry.id);
  }
  await host.syncProjectAfterSceneFileChange();
  host.emit();
  return entry;
}

/**
 * Deletes a scene file. If it was the active document, loads `fallbackSceneId`.
 */
export async function deleteSceneDocumentFile(
  host: ScenePersistenceHost,
  sceneFileId: string,
  fallbackSceneId: string,
  options?: { preserveUndo?: boolean },
): Promise<void> {
  const api = requireSceneApi(host);
  const wasActive = host.getSceneFileId() === sceneFileId;
  await api.deleteScene(sceneFileId);
  await host.syncProjectAfterSceneFileChange();
  if (wasActive) {
    await loadSceneDocument(host, fallbackSceneId, options);
  } else {
    host.emit();
  }
}

export async function restoreDeletedSceneDocument(
  host: ScenePersistenceHost,
  sceneFileId: string,
  snapshot: SceneData,
  options: { open: boolean; restoreStartScene: boolean },
): Promise<void> {
  await requireSceneApi(host).saveScene(sceneFileId, snapshot);
  if (options.restoreStartScene) {
    await host.restoreStartScene(sceneFileId);
  } else {
    await host.syncProjectAfterSceneFileChange();
  }
  if (options.open) {
    host.setSceneFileId(sceneFileId);
    host.setScene(structuredClone(snapshot), { preserveUndo: true });
    host.onSceneOpened(sceneFileId, snapshot.name);
  }
  host.emit();
}
