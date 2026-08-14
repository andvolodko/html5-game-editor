import { access, copyFile, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  computeAssetDatabaseRevision,
  getFileStem,
  ownedAssetPaths,
  relocateOwnedAssetPaths,
  withAsepriteSourcePath,
  type AssetRecord,
} from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import { createId } from "@game-editor/shared";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import {
  ASSETS_ROOT_FOLDER,
  type AssetFolderService,
} from "./asset-folder-service.js";
import type { AssetMutationResult } from "./asset-mutation-service.js";
import { allocateUniqueFileName, normalizeAssetDestination } from "./asset-path-utils.js";
import type { ProjectService } from "./project-service.js";
import { GeneratedAssetFileService } from "./generated-asset-files.js";

const SCENES_FOLDER = "assets/scenes";

function assertNotScenesDestination(destination: string): void {
  if (destination === SCENES_FOLDER || destination.startsWith(`${SCENES_FOLDER}/`)) {
    throw new ValidationError(
      "Cannot place texture assets in the scenes folder (assets/scenes)",
    );
  }
}

function posixDirname(assetPath: string): string {
  const slash = assetPath.lastIndexOf("/");
  return slash > 0 ? assetPath.slice(0, slash) : ASSETS_ROOT_FOLDER;
}

function dedicatedOwnedFolder(record: AssetRecord): string | undefined {
  const owned = ownedAssetPaths(record);
  if (owned.length <= 1) {
    return undefined;
  }
  const dirs = owned.map(posixDirname);
  const first = dirs[0];
  if (!first || first === ASSETS_ROOT_FOLDER) {
    return undefined;
  }
  if (!dirs.every((dir) => dir === first)) {
    return undefined;
  }
  return first;
}

function remapOwnedToFolder(record: AssetRecord, toFolder: string): AssetRecord {
  const remap = (assetPath: string): string =>
    path.posix.join(toFolder, path.posix.basename(assetPath));
  if (record.metadata.kind === "spine") {
    return {
      ...record,
      path: remap(record.path),
      metadata: {
        ...record.metadata,
        atlasPath: remap(record.metadata.atlasPath),
        pagePaths: record.metadata.pagePaths.map(remap),
      },
    };
  }
  if (record.metadata.kind === "gltf") {
    return {
      ...record,
      path: remap(record.path),
      metadata: {
        ...record.metadata,
        ...(record.metadata.bufferPaths
          ? { bufferPaths: record.metadata.bufferPaths.map(remap) }
          : {}),
        ...(record.metadata.imagePaths
          ? { imagePaths: record.metadata.imagePaths.map(remap) }
          : {}),
      },
    };
  }
  if (record.metadata.kind === "aseprite") {
    return withAsepriteSourcePath(record, remap(record.path));
  }
  return { ...record, path: remap(record.path) };
}

/**
 * Copies an asset (and owned companion files) with a new stable id.
 * Destination defaults to the source folder. Never overwrites.
 */
export class AssetDuplicateService {
  private readonly generatedFiles: GeneratedAssetFileService;

  constructor(
    private readonly projectService: ProjectService,
    private readonly store: AssetDatabaseStore,
    private readonly folderService: AssetFolderService,
  ) {
    this.generatedFiles = new GeneratedAssetFileService(projectService);
  }

  async duplicateAsset(
    assetId: string,
    destinationFolder?: string,
  ): Promise<AssetMutationResult> {
    const database = await this.store.load();
    const record = database.get(assetId);
    if (!record) {
      throw new DomainError("ASSET_NOT_FOUND", `Asset not found: ${assetId}`);
    }

    const bundleFolder = dedicatedOwnedFolder(record);
    const sourceFolder = bundleFolder
      ? posixDirname(bundleFolder)
      : posixDirname(record.path);
    const destination = normalizeAssetDestination(destinationFolder ?? sourceFolder);
    assertNotScenesDestination(destination);
    await this.assertDestinationExists(destination);

    const existingNames = await this.collectDestinationNames(destination);
    const written: string[] = [];

    try {
      const clone = bundleFolder
        ? await this.copyDedicatedFolder(
            record,
            bundleFolder,
            destination,
            existingNames,
            written,
          )
        : ownedAssetPaths(record).length > 1
          ? await this.copyOwnedFilesIntoFolder(
              record,
              destination,
              existingNames,
              written,
            )
          : await this.copySingleFile(record, destination, existingNames, written);

      if (record.metadata.kind === "aseprite" && clone.metadata.kind === "aseprite") {
        await this.generatedFiles.copyFile(
          record.metadata.sheetPath,
          clone.metadata.sheetPath,
        );
        await this.generatedFiles.copyFile(
          record.metadata.dataPath,
          clone.metadata.dataPath,
        );
      }

      database.add(clone);
      const data = await this.store.save(database);
      return {
        asset: clone,
        database: data,
        revision: computeAssetDatabaseRevision(data),
        folders: await this.folderService.listFolders(),
      };
    } catch (error) {
      await this.rollbackWritten(written);
      throw error;
    }
  }

  private async copyDedicatedFolder(
    record: AssetRecord,
    bundleFolder: string,
    destination: string,
    existingNames: Set<string>,
    written: string[],
  ): Promise<AssetRecord> {
    const folderName = allocateUniqueFileName(
      path.posix.basename(bundleFolder),
      existingNames,
    );
    const nextFolder = path.posix.join(destination, folderName);
    await this.copyProjectPath(bundleFolder, nextFolder, true);
    written.push(nextFolder);
    const relocated = relocateOwnedAssetPaths(record, bundleFolder, nextFolder);
    return {
      ...relocated,
      id: createId("asset"),
      name: folderName,
    };
  }

  private async copyOwnedFilesIntoFolder(
    record: AssetRecord,
    destination: string,
    existingNames: Set<string>,
    written: string[],
  ): Promise<AssetRecord> {
    const folderName = allocateUniqueFileName(record.name, existingNames);
    const nextFolder = path.posix.join(destination, folderName);
    await mkdir(this.projectService.resolveProjectPath(nextFolder), {
      recursive: true,
    });
    written.push(nextFolder);
    for (const assetPath of ownedAssetPaths(record)) {
      await this.copyProjectPath(
        assetPath,
        path.posix.join(nextFolder, path.posix.basename(assetPath)),
        false,
      );
    }
    const relocated = remapOwnedToFolder(record, nextFolder);
    return {
      ...relocated,
      id: createId("asset"),
      name: folderName,
    };
  }

  private async copySingleFile(
    record: AssetRecord,
    destination: string,
    existingNames: Set<string>,
    written: string[],
  ): Promise<AssetRecord> {
    const fileName = allocateUniqueFileName(
      path.posix.basename(record.path),
      existingNames,
    );
    const nextPath = path.posix.join(destination, fileName);
    await this.copyProjectPath(record.path, nextPath, false);
    written.push(nextPath);
    const relocated =
      record.metadata.kind === "aseprite"
        ? withAsepriteSourcePath(record, nextPath)
        : { ...record, path: nextPath };
    return {
      ...relocated,
      id: createId("asset"),
      name: getFileStem(nextPath),
    };
  }

  private async copyProjectPath(
    fromRelative: string,
    toRelative: string,
    directory: boolean,
  ): Promise<void> {
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
    await mkdir(path.dirname(toAbsolute), { recursive: true });
    if (directory) {
      await cp(fromAbsolute, toAbsolute, { recursive: true });
      return;
    }
    await copyFile(fromAbsolute, toAbsolute);
  }

  private async assertDestinationExists(destination: string): Promise<void> {
    try {
      await access(this.projectService.resolveProjectPath(destination));
    } catch {
      throw new DomainError("FOLDER_NOT_FOUND", `Folder not found: ${destination}`);
    }
  }

  private async collectDestinationNames(destination: string): Promise<Set<string>> {
    const names = new Set<string>();
    const database = await this.store.load();
    for (const asset of database.getAll()) {
      for (const assetPath of ownedAssetPaths(asset)) {
        const dir = posixDirname(assetPath);
        if (dir === destination) {
          names.add(path.posix.basename(assetPath).toLowerCase());
        }
        if (dir === destination || dir.startsWith(`${destination}/`)) {
          const rest =
            dir === destination ? "" : dir.slice(destination.length + 1);
          const first = rest.split("/")[0];
          if (first) {
            names.add(first.toLowerCase());
          }
        }
      }
    }
    try {
      const entries = await readdir(this.projectService.resolveProjectPath(destination));
      for (const entry of entries) {
        names.add(entry.toLowerCase());
      }
    } catch {
      // Destination existence is checked separately.
    }
    return names;
  }

  private async rollbackWritten(written: readonly string[]): Promise<void> {
    for (let i = written.length - 1; i >= 0; i -= 1) {
      const relative = written[i];
      if (!relative) {
        continue;
      }
      try {
        await rm(this.projectService.resolveProjectPath(relative), {
          recursive: true,
          force: true,
        });
      } catch {
        // Best-effort cleanup after a failed duplicate.
      }
    }
  }
}
