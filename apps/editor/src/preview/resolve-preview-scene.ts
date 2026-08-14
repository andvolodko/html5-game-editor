import type { SceneData } from "@game-editor/scene";

export interface PreviewSceneSource {
  getSceneFileId(): string;
  getScene(): SceneData;
  loadSceneData(sceneId: string): Promise<SceneData>;
}

/**
 * Preview plays a snapshot: the live editor document when `sceneId` is the
 * open file, otherwise the saved scene from the project server.
 */
export async function resolvePreviewScene(
  source: PreviewSceneSource,
  sceneId: string,
): Promise<SceneData> {
  if (sceneId === source.getSceneFileId()) {
    return structuredClone(source.getScene());
  }
  return source.loadSceneData(sceneId);
}
