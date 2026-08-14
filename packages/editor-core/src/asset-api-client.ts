import {
  computeAssetDatabaseRevision,
  parseDeletableAssetFolderPath,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";

export interface AssetListResult {
  database: AssetDatabaseData;
  revision: string;
  folders?: string[];
}

export interface AssetImportApiResult {
  imported: AssetRecord[];
  errors: Array<{ fileName: string; message: string }>;
  database?: AssetDatabaseData;
  revision?: string;
  folders?: string[];
}

export interface AssetCreateFolderResult {
  folder: string;
  folders: string[];
}

export interface AssetMutationApiResult {
  asset: AssetRecord;
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

export interface AssetDeleteApiResult {
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

export interface FolderRenameApiResult {
  folder: string;
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

export interface AssetApiClient {
  listAssets(): Promise<AssetListResult>;
  importAssets(
    files: readonly File[],
    destination?: string,
  ): Promise<AssetImportApiResult>;
  createFolder(folderPath: string): Promise<AssetCreateFolderResult>;
  renameAsset(assetId: string, name: string): Promise<AssetMutationApiResult>;
  moveAsset(assetId: string, destination: string): Promise<AssetMutationApiResult>;
  duplicateAsset(
    assetId: string,
    destination?: string,
  ): Promise<AssetMutationApiResult>;
  restoreAsset(assetId: string): Promise<AssetMutationApiResult>;
  deleteAsset(assetId: string): Promise<AssetDeleteApiResult>;
  renameFolder(folderPath: string, name: string): Promise<FolderRenameApiResult>;
  restoreFolder(folderPath: string): Promise<FolderRenameApiResult>;
  deleteFolder(folderPath: string): Promise<AssetDeleteApiResult>;
  getAssetContentUrl(assetId: string, revision?: string): string;
  getAssetPartUrl(assetId: string, part: string, revision?: string): string;
}

export function createFetchAssetApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): AssetApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async listAssets() {
      const response = await fetchImpl(`${root}/assets`);
      const payload = (await response.json()) as {
        ok: boolean;
        database?: AssetDatabaseData;
        folders?: string[];
        revision?: string;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.database === undefined) {
        throw new Error(payload.message ?? `List assets failed (${String(response.status)})`);
      }
      return {
        database: payload.database,
        revision:
          payload.revision ?? computeAssetDatabaseRevision(payload.database),
        ...(payload.folders !== undefined ? { folders: payload.folders } : {}),
      };
    },

    async importAssets(files, destination = "assets") {
      const form = new FormData();
      form.set("destination", destination);
      for (const file of files) {
        form.append("files", file, file.name);
      }
      const response = await fetchImpl(`${root}/assets/import`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        imported?: AssetRecord[];
        errors?: Array<{ fileName: string; message: string }>;
        database?: AssetDatabaseData;
        revision?: string;
        folders?: string[];
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.imported === undefined) {
        throw new Error(payload.message ?? `Import failed (${String(response.status)})`);
      }
      return {
        imported: payload.imported,
        errors: payload.errors ?? [],
        ...(payload.database !== undefined ? { database: payload.database } : {}),
        ...(payload.revision !== undefined ? { revision: payload.revision } : {}),
        ...(payload.folders !== undefined ? { folders: payload.folders } : {}),
      };
    },

    async createFolder(folderPath) {
      const response = await fetchImpl(`${root}/assets/folders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        folder?: string;
        folders?: string[];
        message?: string;
      };
      if (
        !response.ok ||
        !payload.ok ||
        payload.folder === undefined ||
        payload.folders === undefined
      ) {
        throw new Error(payload.message ?? `Create folder failed (${String(response.status)})`);
      }
      return { folder: payload.folder, folders: payload.folders };
    },

    async renameAsset(assetId, name) {
      const response = await fetchImpl(
        `${root}/assets/${encodeURIComponent(assetId)}/rename`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      return parseMutationPayload(response, "Rename asset");
    },

    async moveAsset(assetId, destination) {
      const response = await fetchImpl(
        `${root}/assets/${encodeURIComponent(assetId)}/move`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ destination }),
        },
      );
      return parseMutationPayload(response, "Move asset");
    },

    async duplicateAsset(assetId, destination) {
      const response = await fetchImpl(
        `${root}/assets/${encodeURIComponent(assetId)}/duplicate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(destination ? { destination } : {}),
        },
      );
      return parseMutationPayload(response, "Duplicate asset");
    },

    async restoreAsset(assetId) {
      const response = await fetchImpl(
        `${root}/assets/${encodeURIComponent(assetId)}/restore`,
        { method: "POST" },
      );
      return parseMutationPayload(response, "Restore asset");
    },

    async deleteAsset(assetId) {
      const response = await fetchImpl(
        `${root}/assets/${encodeURIComponent(assetId)}/delete`,
        { method: "POST" },
      );
      return parseDeletePayload(response, "Delete asset");
    },

    async renameFolder(folderPath, name) {
      const response = await fetchImpl(`${root}/assets/folders/rename`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: folderPath, name }),
      });
      return parseFolderMutationPayload(response, "Rename folder");
    },

    async restoreFolder(folderPath) {
      const safePath = parseDeletableAssetFolderPath(folderPath);
      const response = await fetchImpl(`${root}/assets/folders/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: safePath }),
      });
      return parseFolderMutationPayload(response, "Restore folder");
    },

    async deleteFolder(folderPath) {
      // Client-side guard; server re-validates with the same parser + realpath checks.
      const safePath = parseDeletableAssetFolderPath(folderPath);
      const response = await fetchImpl(`${root}/assets/folders/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: safePath }),
      });
      return parseDeletePayload(response, "Delete folder");
    },

    getAssetContentUrl(assetId, revision) {
      const base = `${root}/assets/${encodeURIComponent(assetId)}/content`;
      return revision ? `${base}?v=${encodeURIComponent(revision)}` : base;
    },

    getAssetPartUrl(assetId, part, revision) {
      const base = `${root}/assets/${encodeURIComponent(assetId)}/part/${encodeURIComponent(part)}`;
      return revision ? `${base}?v=${encodeURIComponent(revision)}` : base;
    },
  };
}

async function parseMutationPayload(
  response: Response,
  label: string,
): Promise<AssetMutationApiResult> {
  const payload = (await response.json()) as {
    ok: boolean;
    asset?: AssetRecord;
    database?: AssetDatabaseData;
    revision?: string;
    folders?: string[];
    message?: string;
  };
  if (
    !response.ok ||
    !payload.ok ||
    payload.asset === undefined ||
    payload.database === undefined ||
    payload.revision === undefined ||
    payload.folders === undefined
  ) {
    throw new Error(payload.message ?? `${label} failed (${String(response.status)})`);
  }
  return {
    asset: payload.asset,
    database: payload.database,
    revision: payload.revision,
    folders: payload.folders,
  };
}

async function parseDeletePayload(
  response: Response,
  label: string,
): Promise<AssetDeleteApiResult> {
  const payload = (await response.json()) as {
    ok: boolean;
    database?: AssetDatabaseData;
    revision?: string;
    folders?: string[];
    message?: string;
  };
  if (
    !response.ok ||
    !payload.ok ||
    payload.database === undefined ||
    payload.revision === undefined ||
    payload.folders === undefined
  ) {
    throw new Error(payload.message ?? `${label} failed (${String(response.status)})`);
  }
  return {
    database: payload.database,
    revision: payload.revision,
    folders: payload.folders,
  };
}

async function parseFolderMutationPayload(
  response: Response,
  label: string,
): Promise<FolderRenameApiResult> {
  const payload = (await response.json()) as {
    ok: boolean;
    folder?: string;
    database?: AssetDatabaseData;
    revision?: string;
    folders?: string[];
    message?: string;
  };
  if (
    !response.ok ||
    !payload.ok ||
    payload.folder === undefined ||
    payload.database === undefined ||
    payload.revision === undefined ||
    payload.folders === undefined
  ) {
    throw new Error(payload.message ?? `${label} failed (${String(response.status)})`);
  }
  return {
    folder: payload.folder,
    database: payload.database,
    revision: payload.revision,
    folders: payload.folders,
  };
}
