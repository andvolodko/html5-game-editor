import {
  parseTileSetData,
  type AssetRecord,
  type TileSetData,
} from "@game-editor/assets";

export interface TileSetCreateResult {
  asset: AssetRecord;
  tileset: TileSetData;
}

export interface TileSetApiClient {
  createTileSet(input: {
    name: string;
    imageAssetId: string;
    tileWidth?: number;
    tileHeight?: number;
    margin?: number;
    spacing?: number;
    destination?: string;
  }): Promise<TileSetCreateResult>;
  saveTileSet(assetId: string, tileset: TileSetData): Promise<TileSetData>;
  loadTileSet(assetId: string): Promise<TileSetData>;
}

export function createFetchTileSetApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): TileSetApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async createTileSet(input) {
      const response = await fetchImpl(`${root}/tilesets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        asset?: AssetRecord;
        tileset?: unknown;
        message?: string;
      };
      if (
        !response.ok ||
        !payload.ok ||
        payload.asset === undefined ||
        payload.tileset === undefined
      ) {
        throw new Error(
          payload.message ?? `Create TileSet failed (${String(response.status)})`,
        );
      }
      return {
        asset: payload.asset,
        tileset: parseTileSetData(payload.tileset),
      };
    },

    async saveTileSet(assetId, tileset) {
      const response = await fetchImpl(
        `${root}/tilesets/${encodeURIComponent(assetId)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(tileset),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        tileset?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.tileset === undefined) {
        throw new Error(
          payload.message ?? `Save TileSet failed (${String(response.status)})`,
        );
      }
      return parseTileSetData(payload.tileset);
    },

    async loadTileSet(assetId) {
      const response = await fetchImpl(
        `${root}/tilesets/${encodeURIComponent(assetId)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        tileset?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.tileset === undefined) {
        throw new Error(
          payload.message ?? `Load TileSet failed (${String(response.status)})`,
        );
      }
      return parseTileSetData(payload.tileset);
    },
  };
}
