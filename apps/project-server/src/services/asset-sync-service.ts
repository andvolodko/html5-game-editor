import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  computeAssetDatabaseRevision,
  ownedAssetPaths,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";
import type { ProjectService } from "./project-service.js";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import type {
  AssetImporterRegistry,
  ImportFile,
  ImportPrepareContext,
} from "./asset-importer.js";
import type { AsepriteCompileService } from "./aseprite-compile-service.js";
import { ASSETS_ROOT_FOLDER } from "./asset-folder-service.js";

const SCENES_FOLDER = "assets/scenes";
const IGNORED_FILE_NAMES = new Set(["thumbs.db", "desktop.ini"]);

export interface AssetSyncResult {
  database: AssetDatabaseData;
  revision: string;
  removedIds: string[];
  discovered: AssetRecord[];
  errors: Array<{ fileName: string; message: string }>;
  changed: boolean;
}

/**
 * Reconciles `.project/assets.json` with files under `assets/`.
 * Missing owned files → drop records from the manifest.
 * Unowned importable files → discover via importer registry (paths preserved).
 */
export class AssetSyncService {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly projectService: ProjectService,
    private readonly store: AssetDatabaseStore,
    private readonly registry: AssetImporterRegistry,
    private readonly asepriteCompile?: AsepriteCompileService,
  ) {}

  /** Serialized reconcile — safe under concurrent GET /assets. */
  reconcile(): Promise<AssetSyncResult> {
    const run = this.queue.then(() => this.reconcileUnlocked());
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async reconcileUnlocked(): Promise<AssetSyncResult> {
    const database = await this.store.load();
    const diskFiles = await this.listAssetFiles();
    const diskSet = new Set(diskFiles);
    const errors: Array<{ fileName: string; message: string }> = [];
    const removedIds: string[] = [];

    for (const record of [...database.getAll()]) {
      const owned = ownedAssetPaths(record);
      const missing = owned.some((assetPath) => !diskSet.has(assetPath));
      if (missing) {
        database.remove(record.id);
        removedIds.push(record.id);
      }
    }

    const ownedAfter = new Set<string>();
    for (const record of database.getAll()) {
      for (const assetPath of ownedAssetPaths(record)) {
        ownedAfter.add(assetPath);
      }
    }

    const unowned = diskFiles.filter((filePath) => !ownedAfter.has(filePath));
    const discovered: AssetRecord[] = [];

    if (unowned.length > 0) {
      const byDir = groupPathsByDirectory(unowned);
      for (const [dir, relativePaths] of byDir) {
        const batch = await this.discoverInDirectory(
          dir,
          relativePaths,
          errors,
        );
        for (const record of batch) {
          const owned = ownedAssetPaths(record);
          if (owned.some((assetPath) => ownedAfter.has(assetPath))) {
            errors.push({
              fileName: record.path,
              message: `Skipped discovery; path already owned: ${record.path}`,
            });
            continue;
          }
          database.add(record);
          discovered.push(record);
          for (const assetPath of owned) {
            ownedAfter.add(assetPath);
          }
        }
      }
    }

    const changed = removedIds.length > 0 || discovered.length > 0;
    let compileChanged = false;
    if (this.asepriteCompile) {
      const compiled = await this.asepriteCompile.processDatabase(database);
      errors.push(...compiled.errors);
      compileChanged = compiled.changed;
    }

    const data =
      changed || compileChanged
        ? await this.store.save(database)
        : database.toJSON();

    return {
      database: data,
      revision: computeAssetDatabaseRevision(data),
      removedIds,
      discovered,
      errors,
      changed: changed || compileChanged,
    };
  }

  private async discoverInDirectory(
    dir: string,
    relativePaths: readonly string[],
    errors: Array<{ fileName: string; message: string }>,
  ): Promise<AssetRecord[]> {
    const importFiles: ImportFile[] = [];
    for (const relativePath of relativePaths) {
      try {
        const absolute = this.projectService.resolveProjectPath(relativePath);
        const bytes = await readFile(absolute);
        importFiles.push({
          fileName: path.posix.basename(relativePath),
          bytes,
        });
      } catch (error) {
        errors.push({
          fileName: relativePath,
          message:
            error instanceof Error ? error.message : "Failed to read file",
        });
      }
    }

    if (importFiles.length === 0) {
      return [];
    }

    const context = preservePathsContext(dir);
    const discovered: AssetRecord[] = [];
    let remaining: readonly ImportFile[] = importFiles;

    for (const bundleImporter of this.registry.listBundles()) {
      const partitioned = bundleImporter.partition(remaining);
      errors.push(...partitioned.errors);
      remaining = partitioned.remaining;
      for (const bundle of partitioned.bundles) {
        try {
          const prepared = await bundleImporter.prepareBundle(bundle, context);
          discovered.push(prepared.record);
        } catch (error) {
          errors.push({
            fileName: bundle[0]?.fileName ?? bundleImporter.id,
            message: error instanceof Error ? error.message : "Discover failed",
          });
        }
      }
    }

    for (const file of remaining) {
      const importer = this.registry.find(file);
      if (!importer) {
        continue;
      }
      try {
        const prepared = await importer.prepare(file, context);
        discovered.push(prepared.record);
      } catch (error) {
        errors.push({
          fileName: file.fileName,
          message: error instanceof Error ? error.message : "Discover failed",
        });
      }
    }

    return discovered;
  }

  private async listAssetFiles(): Promise<string[]> {
    const rootAbsolute = this.projectService.resolveProjectPath(ASSETS_ROOT_FOLDER);
    try {
      await access(rootAbsolute);
    } catch {
      return [];
    }

    const out: string[] = [];
    await walkAssetFiles(rootAbsolute, ASSETS_ROOT_FOLDER, out);
    return out.sort();
  }
}

function preservePathsContext(dir: string): ImportPrepareContext {
  return {
    destinationFolder: dir,
    allocateRelativePath: (desiredFileName: string) =>
      path.posix.join(dir, path.posix.basename(desiredFileName)),
    allocateUniqueFolder: () => dir,
  };
}

function groupPathsByDirectory(
  relativePaths: readonly string[],
): Map<string, string[]> {
  const byDir = new Map<string, string[]>();
  for (const relativePath of relativePaths) {
    const dir = path.posix.dirname(relativePath);
    const list = byDir.get(dir);
    if (list) {
      list.push(relativePath);
    } else {
      byDir.set(dir, [relativePath]);
    }
  }
  return byDir;
}

function shouldSkipFileName(name: string): boolean {
  if (name.startsWith(".")) {
    return true;
  }
  return IGNORED_FILE_NAMES.has(name.toLowerCase());
}

function isUnderScenesFolder(relative: string): boolean {
  return relative === SCENES_FOLDER || relative.startsWith(`${SCENES_FOLDER}/`);
}

async function walkAssetFiles(
  absolute: string,
  relative: string,
  out: string[],
): Promise<void> {
  if (isUnderScenesFolder(relative)) {
    return;
  }

  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "." || entry.name === "..") {
      continue;
    }
    const childRelative = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (isUnderScenesFolder(childRelative)) {
        continue;
      }
      await walkAssetFiles(
        path.join(absolute, entry.name),
        childRelative,
        out,
      );
      continue;
    }
    if (!entry.isFile() || shouldSkipFileName(entry.name)) {
      continue;
    }
    out.push(childRelative);
  }
}
