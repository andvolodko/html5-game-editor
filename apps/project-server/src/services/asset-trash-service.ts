import { access, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  derivedAsepritePaths,
  GENERATED_ASSETS_ROOT,
  ownedAssetPaths,
  parseAssetRecord,
  parseDeletableAssetFolderPath,
  spineBundleFolder,
  type AssetRecord,
} from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import type { ProjectService } from "./project-service.js";
import { ASSETS_ROOT_FOLDER } from "./asset-folder-service.js";

const SCENES_FOLDER = "assets/scenes";
const TRASH_ROOT = `${GENERATED_ASSETS_ROOT}/asset-trash`;
const FOLDER_TRASH_ROOT = `${GENERATED_ASSETS_ROOT}/folder-trash`;
const ASSET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Moves deleted asset files under `.generated/asset-trash/<id>/` so undo can
 * restore the same stable assetId. Hidden from the Assets tree.
 */
export class AssetTrashService {
  constructor(private readonly projectService: ProjectService) {}

  async peekRecord(assetId: string): Promise<AssetRecord> {
    const id = assertSafeAssetId(assetId);
    const recordPath = `${stashDir(id)}/record.json`;
    let raw: string;
    try {
      raw = await readFile(this.absolute(recordPath), "utf8");
    } catch {
      throw new DomainError("ASSET_NOT_FOUND", `Deleted asset not found: ${id}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new ValidationError(`Invalid trash record for ${id}`);
    }
    let record: AssetRecord;
    try {
      record = parseAssetRecord(parsed);
    } catch {
      throw new ValidationError(`Invalid trash record for ${id}`);
    }
    if (record.id !== id) {
      throw new ValidationError(`Trash record id mismatch for ${id}`);
    }
    return record;
  }

  async stash(record: AssetRecord): Promise<void> {
    const id = assertSafeAssetId(record.id);
    await this.removeStash(id);
    await mkdir(this.absolute(stashDir(id)), { recursive: true });
    await writeFile(
      this.absolute(`${stashDir(id)}/record.json`),
      JSON.stringify(record),
    );

    const bundleFolder = spineBundleFolder(record);
    if (bundleFolder) {
      await this.moveIntoTrash(bundleFolder, id);
      return;
    }

    for (const assetPath of derivedAsepritePaths(record)) {
      await this.moveIntoTrashIfPresent(assetPath, id);
    }
    for (const assetPath of ownedAssetPaths(record)) {
      await this.moveIntoTrashIfPresent(assetPath, id);
    }
  }

  async restoreFiles(assetId: string, record: AssetRecord): Promise<void> {
    const id = assertSafeAssetId(assetId);
    if (record.id !== id) {
      throw new ValidationError(`Trash record id mismatch for ${id}`);
    }

    const bundleFolder = spineBundleFolder(record);
    if (bundleFolder) {
      await this.moveOutOfTrash(bundleFolder, id);
    } else {
      for (const assetPath of ownedAssetPaths(record)) {
        await this.moveOutOfTrashIfPresent(assetPath, id);
      }
      for (const assetPath of derivedAsepritePaths(record)) {
        await this.moveOutOfTrashIfPresent(assetPath, id);
      }
    }

    await this.removeStash(id);
  }

  async peekFolder(folderPath: string): Promise<{
    folder: string;
    records: AssetRecord[];
  }> {
    const folder = parseDeletableAssetFolderPath(folderPath);
    const manifestPath = `${folderStashDir(folder)}/manifest.json`;
    let raw: string;
    try {
      raw = await readFile(this.absolute(manifestPath), "utf8");
    } catch {
      throw new DomainError(
        "FOLDER_NOT_FOUND",
        `Deleted folder not found: ${folder}`,
      );
    }
    return parseFolderTrashManifest(raw, folder);
  }

  async stashFolder(folderPath: string, records: readonly AssetRecord[]): Promise<void> {
    const folder = parseDeletableAssetFolderPath(folderPath);
    const dir = folderStashDir(folder);
    await rm(this.absolute(dir), { recursive: true, force: true });
    await mkdir(this.absolute(dir), { recursive: true });
    await writeFile(
      this.absolute(`${dir}/manifest.json`),
      JSON.stringify({ folder, records }),
    );
    await this.moveRelativeIntoStash(folder, dir);
    await this.moveRelativeIntoStashIfPresent(
      `${GENERATED_ASSETS_ROOT}/${folder}`,
      dir,
    );
  }

  async restoreFolderFiles(folderPath: string): Promise<void> {
    const folder = parseDeletableAssetFolderPath(folderPath);
    const dir = folderStashDir(folder);
    await this.moveRelativeOutOfStash(folder, dir);
    await this.moveRelativeOutOfStashIfPresent(
      `${GENERATED_ASSETS_ROOT}/${folder}`,
      dir,
    );
    await rm(this.absolute(dir), { recursive: true, force: true });
  }

  private async removeStash(assetId: string): Promise<void> {
    const dir = this.absolute(stashDir(assetId));
    await rm(dir, { recursive: true, force: true });
  }

  private async moveIntoTrashIfPresent(
    relative: string,
    assetId: string,
  ): Promise<void> {
    await this.moveRelativeIntoStashIfPresent(relative, stashDir(assetId));
  }

  private async moveOutOfTrashIfPresent(
    relative: string,
    assetId: string,
  ): Promise<void> {
    await this.moveRelativeOutOfStashIfPresent(relative, stashDir(assetId));
  }

  private async moveIntoTrash(relative: string, assetId: string): Promise<void> {
    await this.moveRelativeIntoStash(relative, stashDir(assetId));
  }

  private async moveOutOfTrash(relative: string, assetId: string): Promise<void> {
    await this.moveRelativeOutOfStash(relative, stashDir(assetId));
  }

  private async moveRelativeIntoStashIfPresent(
    relative: string,
    stashDirectory: string,
  ): Promise<void> {
    if (!(await this.exists(relative))) {
      return;
    }
    await this.moveRelativeIntoStash(relative, stashDirectory);
  }

  private async moveRelativeOutOfStashIfPresent(
    relative: string,
    stashDirectory: string,
  ): Promise<void> {
    const from = assertStashSourcePath(relative);
    if (!(await this.exists(stashFilesRelative(stashDirectory, from)))) {
      return;
    }
    await this.moveRelativeOutOfStash(relative, stashDirectory);
  }

  private async moveRelativeIntoStash(
    relative: string,
    stashDirectory: string,
  ): Promise<void> {
    const from = assertStashSourcePath(relative);
    const to = stashFilesRelative(stashDirectory, from);
    await this.renamePath(from, to, { destinationMustBeFree: true });
  }

  private async moveRelativeOutOfStash(
    relative: string,
    stashDirectory: string,
  ): Promise<void> {
    const dest = assertStashSourcePath(relative);
    const from = stashFilesRelative(stashDirectory, dest);
    await this.renamePath(from, dest, { destinationMustBeFree: true });
  }

  private async renamePath(
    fromRelative: string,
    toRelative: string,
    options: { destinationMustBeFree: boolean },
  ): Promise<void> {
    const fromAbsolute = this.absolute(fromRelative);
    const toAbsolute = this.absolute(toRelative);
    let stats;
    try {
      stats = await lstat(fromAbsolute);
    } catch {
      throw new DomainError("ASSET_NOT_FOUND", `Path not found: ${fromRelative}`);
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to move a symbolic link");
    }

    if (options.destinationMustBeFree && (await this.exists(toRelative))) {
      throw new DomainError("ASSET_PATH_EXISTS", `Path already exists: ${toRelative}`);
    }

    await mkdir(path.dirname(toAbsolute), { recursive: true });
    await rename(fromAbsolute, toAbsolute);
  }

  private async exists(relative: string): Promise<boolean> {
    try {
      await access(this.absolute(relative));
      return true;
    } catch {
      return false;
    }
  }

  private absolute(relative: string): string {
    return this.projectService.resolveProjectPath(relative);
  }
}

function stashDir(assetId: string): string {
  return `${TRASH_ROOT}/${assetId}`;
}

function folderStashDir(folder: string): string {
  return `${FOLDER_TRASH_ROOT}/${encodeURIComponent(folder)}`;
}

function stashFilesRelative(stashDirectory: string, originalRelative: string): string {
  return `${stashDirectory}/files/${originalRelative}`;
}

function parseFolderTrashManifest(
  raw: string,
  expectedFolder: string,
): { folder: string; records: AssetRecord[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ValidationError(`Invalid folder trash manifest for ${expectedFolder}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ValidationError(`Invalid folder trash manifest for ${expectedFolder}`);
  }
  const folderValue = "folder" in parsed ? parsed.folder : undefined;
  const recordsValue = "records" in parsed ? parsed.records : undefined;
  if (typeof folderValue !== "string" || !Array.isArray(recordsValue)) {
    throw new ValidationError(`Invalid folder trash manifest for ${expectedFolder}`);
  }
  const folder = parseDeletableAssetFolderPath(folderValue);
  if (folder !== expectedFolder) {
    throw new ValidationError(`Folder trash path mismatch for ${expectedFolder}`);
  }
  const records = recordsValue.map((entry) => parseAssetRecord(entry));
  return { folder, records };
}

function assertSafeAssetId(assetId: string): string {
  if (!ASSET_ID_PATTERN.test(assetId) || assetId.includes("..")) {
    throw new ValidationError(`Invalid asset id: ${assetId}`);
  }
  return assetId;
}

function assertStashSourcePath(relative: string): string {
  const normalized = relative.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new ValidationError(`Refusing unsafe asset path: ${relative}`);
  }
  if (normalized === TRASH_ROOT || normalized.startsWith(`${TRASH_ROOT}/`)) {
    throw new ValidationError(`Refusing trash path as stash source: ${relative}`);
  }
  if (
    normalized === FOLDER_TRASH_ROOT ||
    normalized.startsWith(`${FOLDER_TRASH_ROOT}/`)
  ) {
    throw new ValidationError(`Refusing trash path as stash source: ${relative}`);
  }
  const underAssets =
    normalized === ASSETS_ROOT_FOLDER ||
    normalized.startsWith(`${ASSETS_ROOT_FOLDER}/`);
  const underGenerated =
    normalized === GENERATED_ASSETS_ROOT ||
    normalized.startsWith(`${GENERATED_ASSETS_ROOT}/`);
  if (!underAssets && !underGenerated) {
    throw new ValidationError(`Refusing to stash path outside assets/: ${relative}`);
  }
  if (
    normalized === SCENES_FOLDER ||
    normalized.startsWith(`${SCENES_FOLDER}/`)
  ) {
    throw new ValidationError("Cannot stash files under assets/scenes");
  }
  return normalized;
}
