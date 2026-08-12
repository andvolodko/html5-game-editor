import { access, lstat, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  computeAssetDatabaseRevision,
  ownedAssetPaths,
  parseDeletableAssetFolderPath,
  relocateOwnedAssetPaths,
  spineBundleFolder,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import type { ProjectService } from "./project-service.js";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import type { AssetFolderService } from "./asset-folder-service.js";
import {
  assertValidFolderSegment,
  ASSETS_ROOT_FOLDER,
} from "./asset-folder-service.js";
import { normalizeAssetDestination } from "./asset-path-utils.js";

const ASSET_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;
const SCENES_FOLDER = "assets/scenes";

function assertNotScenesDestination(destination: string): void {
  if (destination === SCENES_FOLDER || destination.startsWith(`${SCENES_FOLDER}/`)) {
    throw new ValidationError(
      "Cannot place texture assets in the scenes folder (assets/scenes)",
    );
  }
}

function assertNotReservedScenesFolder(folder: string): void {
  if (folder === SCENES_FOLDER) {
    throw new ValidationError("Cannot rename the reserved scenes folder");
  }
}

export interface AssetMutationResult {
  asset: AssetRecord;
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

export interface FolderRenameResult {
  folder: string;
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

export interface AssetDeleteResult {
  database: AssetDatabaseData;
  revision: string;
  folders: string[];
}

/**
 * Renames / moves / deletes assets and folders while keeping stable asset IDs.
 * Filesystem + manifest updates happen in one service method (single-writer).
 */
export class AssetMutationService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly store: AssetDatabaseStore,
    private readonly folderService: AssetFolderService,
  ) {}

  async renameAsset(assetId: string, newName: string): Promise<AssetMutationResult> {
    const name = newName.trim();
    assertValidAssetName(name);

    const database = await this.store.load();
    const record = database.get(assetId);
    if (!record) {
      throw new DomainError("ASSET_NOT_FOUND", `Asset not found: ${assetId}`);
    }

    if (record.metadata.kind === "spine") {
      const bundleFolder = spineBundleFolder(record);
      if (bundleFolder) {
        const parent = path.posix.dirname(bundleFolder);
        const nextFolder = path.posix.join(parent, name);
        if (nextFolder === bundleFolder && record.name === name) {
          const data = database.toJSON();
          return {
            asset: record,
            database: data,
            revision: computeAssetDatabaseRevision(data),
            folders: await this.folderService.listFolders(),
          };
        }
        if (database.findByPath(path.posix.join(nextFolder, path.posix.basename(record.path)))) {
          throw new DomainError(
            "ASSET_PATH_EXISTS",
            `Asset already exists: ${nextFolder}`,
          );
        }
        await this.renameFile(bundleFolder, nextFolder);
        const updated = {
          ...relocateOwnedAssetPaths(record, bundleFolder, nextFolder),
          name,
        };
        database.update(updated);
        const data = await this.store.save(database);
        return {
          asset: updated,
          database: data,
          revision: computeAssetDatabaseRevision(data),
          folders: await this.folderService.listFolders(),
        };
      }
    }

    const ext = path.posix.extname(record.path);
    const dir = path.posix.dirname(record.path);
    const nextFileName = `${name}${ext}`;
    const nextPath = path.posix.join(dir, nextFileName);

    if (nextPath === record.path && record.name === name) {
      const data = database.toJSON();
      return {
        asset: record,
        database: data,
        revision: computeAssetDatabaseRevision(data),
        folders: await this.folderService.listFolders(),
      };
    }

    if (database.findByPath(nextPath)) {
      throw new DomainError("ASSET_PATH_EXISTS", `Asset already exists: ${nextPath}`);
    }

    await this.renameFile(record.path, nextPath);
    const updated: AssetRecord = { ...record, name, path: nextPath };
    database.update(updated);
    const data = await this.store.save(database);
    return {
      asset: updated,
      database: data,
      revision: computeAssetDatabaseRevision(data),
      folders: await this.folderService.listFolders(),
    };
  }

  async moveAsset(
    assetId: string,
    destinationFolder: string,
  ): Promise<AssetMutationResult> {
    const destination = normalizeAssetDestination(destinationFolder);
    assertNotScenesDestination(destination);
    const database = await this.store.load();
    const record = database.get(assetId);
    if (!record) {
      throw new DomainError("ASSET_NOT_FOUND", `Asset not found: ${assetId}`);
    }

    const fileName = path.posix.basename(record.path);
    const currentDir = path.posix.dirname(record.path);

    if (record.metadata.kind === "spine") {
      const bundleFolder = spineBundleFolder(record);
      if (bundleFolder) {
        const folderName = path.posix.basename(bundleFolder);
        if (path.posix.dirname(bundleFolder) === destination) {
          const data = database.toJSON();
          return {
            asset: record,
            database: data,
            revision: computeAssetDatabaseRevision(data),
            folders: await this.folderService.listFolders(),
          };
        }
        const destAbsolute = this.projectService.resolveProjectPath(destination);
        try {
          await access(destAbsolute);
        } catch {
          throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${destination}`);
        }
        const nextFolder = path.posix.join(destination, folderName);
        if (database.findByPath(path.posix.join(nextFolder, fileName))) {
          throw new DomainError(
            "ASSET_PATH_EXISTS",
            `Asset already exists: ${nextFolder}`,
          );
        }
        await this.renameFile(bundleFolder, nextFolder);
        const updated = relocateOwnedAssetPaths(record, bundleFolder, nextFolder);
        database.update(updated);
        const data = await this.store.save(database);
        return {
          asset: updated,
          database: data,
          revision: computeAssetDatabaseRevision(data),
          folders: await this.folderService.listFolders(),
        };
      }
    }

    if (currentDir === destination) {
      const data = database.toJSON();
      return {
        asset: record,
        database: data,
        revision: computeAssetDatabaseRevision(data),
        folders: await this.folderService.listFolders(),
      };
    }

    const destAbsolute = this.projectService.resolveProjectPath(destination);
    try {
      await access(destAbsolute);
    } catch {
      throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${destination}`);
    }

    const nextPath = path.posix.join(destination, fileName);
    if (database.findByPath(nextPath)) {
      throw new DomainError("ASSET_PATH_EXISTS", `Asset already exists: ${nextPath}`);
    }

    await this.renameFile(record.path, nextPath);
    const updated: AssetRecord = { ...record, path: nextPath };
    database.update(updated);
    const data = await this.store.save(database);
    return {
      asset: updated,
      database: data,
      revision: computeAssetDatabaseRevision(data),
      folders: await this.folderService.listFolders(),
    };
  }

  async renameFolder(
    folderPath: string,
    newName: string,
  ): Promise<FolderRenameResult> {
    const name = newName.trim();
    assertValidFolderSegment(name);

    const folder = normalizeAssetDestination(folderPath);
    if (folder === ASSETS_ROOT_FOLDER) {
      throw new ValidationError("Cannot rename the assets root folder");
    }
    assertNotReservedScenesFolder(folder);

    const parent = path.posix.dirname(folder);
    const nextFolder = path.posix.join(parent, name);
    if (nextFolder === folder) {
      const database = await this.store.load();
      const data = database.toJSON();
      return {
        folder,
        database: data,
        revision: computeAssetDatabaseRevision(data),
        folders: await this.folderService.listFolders(),
      };
    }

    const known = await this.folderService.listFolders();
    if (!known.includes(folder)) {
      throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${folder}`);
    }
    if (known.includes(nextFolder)) {
      throw new DomainError("FOLDER_EXISTS", `Folder already exists: ${nextFolder}`);
    }

    await this.renameFile(folder, nextFolder);

    const database = await this.store.load();
    const prefix = `${folder}/`;
    for (const asset of [...database.getAll()]) {
      if (asset.path === folder || asset.path.startsWith(prefix)) {
        database.update(relocateOwnedAssetPaths(asset, folder, nextFolder));
      }
    }
    const data = await this.store.save(database);
    return {
      folder: nextFolder,
      database: data,
      revision: computeAssetDatabaseRevision(data),
      folders: await this.folderService.listFolders(),
    };
  }

  async deleteAsset(assetId: string): Promise<AssetDeleteResult> {
    const database = await this.store.load();
    const record = database.get(assetId);
    if (!record) {
      throw new DomainError("ASSET_NOT_FOUND", `Asset not found: ${assetId}`);
    }

    const bundleFolder = spineBundleFolder(record);
    if (bundleFolder) {
      await this.removeOwnedDirectory(bundleFolder);
    } else {
      for (const assetPath of ownedAssetPaths(record)) {
        await this.removeOwnedFile(assetPath);
      }
    }

    database.remove(assetId);
    const data = await this.store.save(database);
    return {
      database: data,
      revision: computeAssetDatabaseRevision(data),
      folders: await this.folderService.listFolders(),
    };
  }

  async deleteFolder(folderPath: string): Promise<AssetDeleteResult> {
    // Strict parse — never silently rewrite traversal into another folder.
    const folder = parseDeletableAssetFolderPath(folderPath);

    const known = await this.folderService.listFolders();
    if (!known.includes(folder)) {
      throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${folder}`);
    }

    await this.assertSafeDeletableDirectory(folder);

    const database = await this.store.load();
    const prefix = `${folder}/`;
    for (const asset of [...database.getAll()]) {
      const underFolder = ownedAssetPaths(asset).some(
        (assetPath) => assetPath === folder || assetPath.startsWith(prefix),
      );
      if (underFolder) {
        database.remove(asset.id);
      }
    }

    await this.removeOwnedDirectory(folder);
    const data = await this.store.save(database);
    return {
      database: data,
      revision: computeAssetDatabaseRevision(data),
      folders: await this.folderService.listFolders(),
    };
  }

  /**
   * Ensures a relative path is a real directory strictly inside `assets/`,
   * not a symlink, and not the assets root itself.
   */
  private async assertSafeDeletableDirectory(relative: string): Promise<string> {
    const folder = parseDeletableAssetFolderPath(relative);
    const absolute = this.projectService.resolveProjectPath(folder);
    const assetsRootAbsolute = this.projectService.resolveProjectPath(
      ASSETS_ROOT_FOLDER,
    );

    let stats;
    try {
      stats = await lstat(absolute);
    } catch {
      throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${folder}`);
    }

    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to delete a symbolic link");
    }
    if (!stats.isDirectory()) {
      throw new ValidationError(`Not a directory: ${folder}`);
    }

    const realAbsolute = await realpath(absolute);
    const realAssetsRoot = await realpath(assetsRootAbsolute);
    assertPathStrictlyInside(realAbsolute, realAssetsRoot, folder);

    return realAbsolute;
  }

  private async removeOwnedDirectory(relative: string): Promise<void> {
    const absolute = await this.assertSafeDeletableDirectory(relative);
    await rm(absolute, { recursive: true });
  }

  private async removeOwnedFile(relative: string): Promise<void> {
    const normalized = relative.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      !normalized.startsWith(`${ASSETS_ROOT_FOLDER}/`) ||
      normalized.includes("..") ||
      normalized === ASSETS_ROOT_FOLDER
    ) {
      throw new ValidationError(`Refusing to delete unsafe asset path: ${relative}`);
    }
    if (
      normalized === SCENES_FOLDER ||
      normalized.startsWith(`${SCENES_FOLDER}/`)
    ) {
      throw new ValidationError("Cannot delete files under assets/scenes");
    }

    const absolute = this.projectService.resolveProjectPath(normalized);
    const assetsRootAbsolute = this.projectService.resolveProjectPath(
      ASSETS_ROOT_FOLDER,
    );

    let stats;
    try {
      stats = await lstat(absolute);
    } catch {
      return;
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to delete a symbolic link");
    }
    if (!stats.isFile()) {
      throw new ValidationError(`Not a file: ${normalized}`);
    }

    const realAbsolute = await realpath(absolute);
    const realAssetsRoot = await realpath(assetsRootAbsolute);
    assertPathStrictlyInside(realAbsolute, realAssetsRoot, normalized);
    await rm(realAbsolute);
  }

  private async renameFile(fromRelative: string, toRelative: string): Promise<void> {
    const fromAbsolute = this.projectService.resolveProjectPath(fromRelative);
    const toAbsolute = this.projectService.resolveProjectPath(toRelative);
    try {
      await access(toAbsolute);
      throw new DomainError("ASSET_PATH_EXISTS", `Path already exists: ${toRelative}`);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
    }
    await rename(fromAbsolute, toAbsolute);
  }
}

export function assertValidAssetName(name: string): void {
  if (!ASSET_NAME_PATTERN.test(name) || name.includes("/") || name.includes("\\")) {
    throw new ValidationError(`Invalid asset name: ${name}`);
  }
}

/** `candidate` must resolve strictly inside `container` (not equal to it). */
function assertPathStrictlyInside(
  candidateAbsolute: string,
  containerAbsolute: string,
  label: string,
): void {
  const containerWithSep = containerAbsolute.endsWith(path.sep)
    ? containerAbsolute
    : `${containerAbsolute}${path.sep}`;
  if (
    candidateAbsolute === containerAbsolute ||
    !candidateAbsolute.startsWith(containerWithSep)
  ) {
    throw new DomainError(
      "PATH_ESCAPE",
      `Refusing to delete path outside assets/: ${label}`,
    );
  }
}
