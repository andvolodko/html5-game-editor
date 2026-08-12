import {
  parseSceneData,
  type SceneData,
} from "@game-editor/scene";
import type { DocumentManager } from "./document-manager.js";
import type { SceneApiClient, SceneListEntry } from "./scene-api-client.js";
import { allocateSceneFileId } from "./scene-api-client.js";

export interface ScenePersistenceHost {
  getSceneApi(): SceneApiClient | undefined;
  getSceneFileId(): string;
  setSceneFileId(id: string): void;
  document: DocumentManager;
  setScene(scene: SceneData): void;
  emit(): void;
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
): Promise<void> {
  const sceneApi = requireSceneApi(host);
  host.setSceneFileId(sceneFileId);
  const loaded = await sceneApi.loadScene(sceneFileId);
  host.setScene(parseSceneData(loaded));
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
): Promise<void> {
  const api = requireSceneApi(host);
  const wasActive = host.getSceneFileId() === sceneFileId;
  await api.deleteScene(sceneFileId);
  if (wasActive) {
    await loadSceneDocument(host, fallbackSceneId);
  } else {
    host.emit();
  }
}
