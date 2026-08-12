import {
  AssetDatabase,
  getFileBasename,
  textureFormatFromMimeType,
  type AssetRecord,
  type AssetResolver,
  type GltfAssetUrls,
  type SpineAssetUrls,
} from "@game-editor/assets";
import { collectReferencedAssetIds, type SceneData } from "@game-editor/scene";
import type {
  AssetApiClient,
  AssetDeleteApiResult,
  AssetMutationApiResult,
} from "./asset-api-client.js";

export type {
  AssetApiClient,
  AssetListResult,
  AssetImportApiResult,
  AssetCreateFolderResult,
  AssetMutationApiResult,
  AssetDeleteApiResult,
  FolderRenameApiResult,
} from "./asset-api-client.js";
export { createFetchAssetApiClient } from "./asset-api-client.js";

export type AssetManagerStatus = "idle" | "loading" | "importing" | "error";

type Listener = () => void;

/**
 * Editor-owned asset catalogue. Syncs with project-server via revision.
 * Not a global singleton.
 */
export class AssetManager implements AssetResolver {
  private database = new AssetDatabase();
  private folders: string[] = ["assets"];
  private status: AssetManagerStatus = "idle";
  private error: string | undefined;
  private revision: string | undefined;
  private readonly listeners = new Set<Listener>();

  constructor(private api: AssetApiClient | undefined) {}

  setApi(api: AssetApiClient): void {
    this.api = api;
  }

  getDatabase(): AssetDatabase {
    return this.database;
  }

  getAll(): readonly AssetRecord[] {
    return this.database.getAll();
  }

  getFolders(): readonly string[] {
    return this.folders;
  }

  get(assetId: string): AssetRecord | undefined {
    return this.database.get(assetId);
  }

  getStatus(): AssetManagerStatus {
    return this.status;
  }

  getError(): string | undefined {
    return this.error;
  }

  /** Catalogue content revision from last successful sync. */
  getRevision(): string | undefined {
    return this.revision;
  }

  /**
   * AssetResolver port — stable by assetId.
   * Do not bind to catalogue revision: moves/renames change revision but not
   * bytes, and a changing URL forces the scene renderer to destroy/reload
   * textures (sprites vanish). Bust the cache explicitly on content replace.
   */
  resolveUrl(assetId: string): string | undefined {
    return this.getContentUrl(assetId);
  }

  /**
   * Pixi load hint for extensionless `/assets/:id/content` URLs.
   * Derived from texture MIME in the catalogue.
   */
  resolveTextureFormat(assetId: string): string | undefined {
    const asset = this.database.get(assetId);
    if (!asset || asset.metadata.kind !== "texture") {
      return undefined;
    }
    return textureFormatFromMimeType(asset.metadata.mimeType);
  }

  getContentUrl(assetId: string): string | undefined {
    if (!this.api || !this.database.has(assetId)) {
      return undefined;
    }
    // Stable URL: path/name catalogue edits must not change the fetch key.
    return this.api.getAssetContentUrl(assetId);
  }

  resolveSpinePartUrl(assetId: string, part: string): string | undefined {
    if (!this.api || !this.database.has(assetId)) {
      return undefined;
    }
    const asset = this.database.get(assetId);
    if (!asset || asset.metadata.kind !== "spine") {
      return undefined;
    }
    return this.api.getAssetPartUrl(assetId, part);
  }

  resolveSpineUrls(assetId: string): SpineAssetUrls | undefined {
    const asset = this.database.get(assetId);
    if (!asset || asset.metadata.kind !== "spine") {
      return undefined;
    }
    const skeletonUrl = this.resolveUrl(assetId);
    const atlasUrl = this.resolveSpinePartUrl(
      assetId,
      getFileBasename(asset.metadata.atlasPath),
    );
    if (!skeletonUrl || !atlasUrl) {
      return undefined;
    }
    const pageUrls: Record<string, string> = {};
    for (const pagePath of asset.metadata.pagePaths) {
      const name = getFileBasename(pagePath);
      const url = this.resolveSpinePartUrl(assetId, name);
      if (!url) {
        return undefined;
      }
      pageUrls[name] = url;
    }
    return {
      skeletonUrl,
      skeletonFormat: asset.metadata.skeletonFormat,
      atlasUrl,
      pageUrls,
    };
  }

  resolveGltfPartUrl(assetId: string, part: string): string | undefined {
    if (!this.api || !this.database.has(assetId)) {
      return undefined;
    }
    const asset = this.database.get(assetId);
    if (!asset || asset.metadata.kind !== "gltf") {
      return undefined;
    }
    return this.api.getAssetPartUrl(assetId, part);
  }

  resolveGltfUrls(assetId: string): GltfAssetUrls | undefined {
    const asset = this.database.get(assetId);
    if (!asset || asset.metadata.kind !== "gltf") {
      return undefined;
    }
    const rootUrl = this.resolveUrl(assetId);
    if (!rootUrl) {
      return undefined;
    }
    const partUrls: Record<string, string> = {};
    const owned = [
      ...(asset.metadata.bufferPaths ?? []),
      ...(asset.metadata.imagePaths ?? []),
    ];
    for (const partPath of owned) {
      const name = getFileBasename(partPath);
      const url = this.resolveGltfPartUrl(assetId, name);
      if (!url) {
        return undefined;
      }
      partUrls[name] = url;
    }
    return {
      rootUrl,
      format: asset.metadata.format,
      partUrls,
    };
  }

  /** Asset ids referenced by a scene (delete / usage prep). */
  getReferencedAssetIds(scene: SceneData): ReadonlySet<string> {
    return new Set(collectReferencedAssetIds(scene));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async refresh(options?: { force?: boolean }): Promise<void> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    const announceLoading =
      options?.force === true || this.revision === undefined;
    if (announceLoading) {
      this.status = "loading";
      this.error = undefined;
      this.emit();
    }
    try {
      const result = await this.api.listAssets();
      const foldersUnchanged =
        result.folders === undefined ||
        stringArraysEqual(this.folders, result.folders);
      if (
        !options?.force &&
        this.revision !== undefined &&
        result.revision === this.revision &&
        foldersUnchanged
      ) {
        if (announceLoading) {
          this.status = "idle";
          this.emit();
        }
        return;
      }

      const catalogueChanged = this.database.applySnapshot(result.database);
      const foldersChanged =
        result.folders !== undefined && this.replaceFolders(result.folders);
      this.revision = result.revision;
      this.status = "idle";
      this.error = undefined;
      if (announceLoading || catalogueChanged || foldersChanged) {
        this.emit();
      }
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Failed to load assets";
      this.emit();
      throw error;
    }
  }

  async createFolder(folderPath: string): Promise<string> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.createFolder(folderPath);
      this.replaceFolders(result.folders);
      this.status = "idle";
      this.emit();
      return result.folder;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Create folder failed";
      this.emit();
      throw error;
    }
  }

  async renameAsset(assetId: string, name: string): Promise<AssetRecord> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.renameAsset(assetId, name);
      this.applyMutationResult(result);
      return result.asset;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Rename asset failed";
      this.emit();
      throw error;
    }
  }

  async moveAsset(assetId: string, destinationFolder: string): Promise<AssetRecord> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.moveAsset(assetId, destinationFolder);
      this.applyMutationResult(result);
      return result.asset;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Move asset failed";
      this.emit();
      throw error;
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.deleteAsset(assetId);
      this.applyDeleteResult(result);
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Delete asset failed";
      this.emit();
      throw error;
    }
  }

  async renameFolder(folderPath: string, name: string): Promise<string> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.renameFolder(folderPath, name);
      this.database.applySnapshot(result.database);
      this.revision = result.revision;
      this.replaceFolders(result.folders);
      this.status = "idle";
      this.emit();
      return result.folder;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Rename folder failed";
      this.emit();
      throw error;
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.deleteFolder(folderPath);
      this.applyDeleteResult(result);
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Delete folder failed";
      this.emit();
      throw error;
    }
  }

  async importFiles(
    files: readonly File[],
    destination = "assets",
  ): Promise<{ imported: AssetRecord[]; errors: Array<{ fileName: string; message: string }> }> {
    if (!this.api) {
      throw new Error("Asset API client is not configured");
    }
    this.status = "importing";
    this.error = undefined;
    this.emit();
    try {
      const result = await this.api.importAssets(files, destination);
      if (result.database && result.revision) {
        this.database.applySnapshot(result.database);
        this.revision = result.revision;
        if (result.folders) {
          this.replaceFolders(result.folders);
        }
        this.status = "idle";
        this.emit();
      } else {
        await this.refresh({ force: true });
      }
      return {
        imported: result.imported,
        errors: result.errors,
      };
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Import failed";
      this.emit();
      throw error;
    }
  }

  private applyMutationResult(result: AssetMutationApiResult): void {
    this.database.applySnapshot(result.database);
    this.revision = result.revision;
    this.replaceFolders(result.folders);
    this.status = "idle";
    this.emit();
  }

  private applyDeleteResult(result: AssetDeleteApiResult): void {
    this.database.applySnapshot(result.database);
    this.revision = result.revision;
    this.replaceFolders(result.folders);
    this.status = "idle";
    this.emit();
  }

  /** Replace folder list only when contents differ; keeps array identity otherwise. */
  private replaceFolders(next: readonly string[]): boolean {
    if (stringArraysEqual(this.folders, next)) {
      return false;
    }
    this.folders = [...next];
    return true;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}
