import type { SceneData } from "@game-editor/scene";

export interface SceneListEntry {
  id: string;
  path: string;
}

export interface SceneApiClient {
  listScenes(): Promise<SceneListEntry[]>;
  saveScene(sceneId: string, scene: SceneData): Promise<SceneData>;
  loadScene(sceneId: string): Promise<SceneData>;
  createScene(sceneId: string, name?: string): Promise<SceneData>;
  renameScene(sceneId: string, newSceneId: string): Promise<SceneListEntry>;
  deleteScene(sceneId: string): Promise<void>;
}

const SCENE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidSceneFileId(sceneId: string): boolean {
  return SCENE_ID_PATTERN.test(sceneId);
}

export function allocateSceneFileId(
  existing: SceneListEntry[],
  base = "untitled",
): string {
  const ids = new Set(existing.map((entry) => entry.id));
  if (!ids.has(base)) {
    return base;
  }
  let suffix = 1;
  while (ids.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function createFetchSceneApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): SceneApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async listScenes() {
      const response = await fetchImpl(`${root}/scenes`);
      const payload = (await response.json()) as {
        ok: boolean;
        scenes?: SceneListEntry[];
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.scenes === undefined) {
        throw new Error(payload.message ?? `List scenes failed (${String(response.status)})`);
      }
      return payload.scenes;
    },

    async saveScene(sceneId, scene) {
      const response = await fetchImpl(
        `${root}/scenes/${encodeURIComponent(sceneId)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(scene),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        scene?: SceneData;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.scene === undefined) {
        throw new Error(payload.message ?? `Save failed (${String(response.status)})`);
      }
      return payload.scene;
    },

    async loadScene(sceneId) {
      const response = await fetchImpl(
        `${root}/scenes/${encodeURIComponent(sceneId)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        scene?: SceneData;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.scene === undefined) {
        throw new Error(payload.message ?? `Load failed (${String(response.status)})`);
      }
      return payload.scene;
    },

    async createScene(sceneId, name) {
      const response = await fetchImpl(`${root}/scenes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: sceneId, ...(name !== undefined ? { name } : {}) }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        scene?: SceneData;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.scene === undefined) {
        throw new Error(payload.message ?? `Create scene failed (${String(response.status)})`);
      }
      return payload.scene;
    },

    async renameScene(sceneId, newSceneId) {
      const response = await fetchImpl(
        `${root}/scenes/${encodeURIComponent(sceneId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: newSceneId }),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        scene?: SceneListEntry;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.scene === undefined) {
        throw new Error(payload.message ?? `Rename scene failed (${String(response.status)})`);
      }
      return payload.scene;
    },

    async deleteScene(sceneId) {
      if (!isValidSceneFileId(sceneId)) {
        throw new Error(`Invalid scene id: ${sceneId}`);
      }
      const response = await fetchImpl(
        `${root}/scenes/${encodeURIComponent(sceneId)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? `Delete scene failed (${String(response.status)})`);
      }
    },
  };
}
