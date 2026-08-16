import {
  parsePrefabData,
  type PrefabData,
  type SceneNodeData,
} from "@game-editor/scene";
import type { AssetRecord } from "@game-editor/assets";

export interface PrefabCreateResult {
  asset: AssetRecord;
  prefab: PrefabData;
}

export interface PrefabApiClient {
  createPrefab(input: {
    name: string;
    root: SceneNodeData;
    destination?: string;
  }): Promise<PrefabCreateResult>;
  savePrefab(assetId: string, prefab: PrefabData): Promise<PrefabData>;
  loadPrefab(assetId: string): Promise<PrefabData>;
}

export function createFetchPrefabApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): PrefabApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async createPrefab(input) {
      const response = await fetchImpl(`${root}/prefabs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        asset?: AssetRecord;
        prefab?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.asset === undefined || payload.prefab === undefined) {
        throw new Error(payload.message ?? `Create prefab failed (${String(response.status)})`);
      }
      return {
        asset: payload.asset,
        prefab: parsePrefabData(payload.prefab),
      };
    },

    async savePrefab(assetId, prefab) {
      const response = await fetchImpl(`${root}/prefabs/${encodeURIComponent(assetId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefab),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        prefab?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.prefab === undefined) {
        throw new Error(payload.message ?? `Save prefab failed (${String(response.status)})`);
      }
      return parsePrefabData(payload.prefab);
    },

    async loadPrefab(assetId) {
      const response = await fetchImpl(`${root}/prefabs/${encodeURIComponent(assetId)}`);
      const payload = (await response.json()) as {
        ok: boolean;
        prefab?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.prefab === undefined) {
        throw new Error(payload.message ?? `Load prefab failed (${String(response.status)})`);
      }
      return parsePrefabData(payload.prefab);
    },
  };
}
