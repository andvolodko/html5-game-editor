import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  computeAssetDatabaseRevision,
  ownedAssetPaths,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";
import { DomainError } from "@game-editor/core";
import { createId } from "@game-editor/shared";
import type { ProjectService } from "./project-service.js";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import type {
  AssetImporterRegistry,
  ImportFile,
  PreparedAssetImport,
} from "./asset-importer.js";
import type { AsepriteCompileService } from "./aseprite-compile-service.js";
import { normalizeAssetDestination } from "./asset-path-utils.js";
import { ImportPathAllocator } from "./import-path-allocator.js";

const SCENES_FOLDER = "assets/scenes";

export interface AssetImportResult {
  imported: AssetRecord[];
  errors: Array<{ fileName: string; message: string }>;
  database: AssetDatabaseData;
  revision: string;
}

/**
 * Orchestrates pluggable importers with a transactional commit:
 * prepare → stage bytes → move to final paths → single manifest save.
 * On failure after staging, rolls back written files and does not save the DB.
 */
export class AssetImportService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly store: AssetDatabaseStore,
    private readonly registry: AssetImporterRegistry,
    private readonly asepriteCompile?: AsepriteCompileService,
  ) {}

  async importFiles(
    files: readonly ImportFile[],
    destinationFolder?: string,
  ): Promise<AssetImportResult> {
    const destination = normalizeAssetDestination(destinationFolder);
    if (destination === SCENES_FOLDER || destination.startsWith(`${SCENES_FOLDER}/`)) {
      throw new DomainError(
        "INVALID_DESTINATION",
        "Cannot import assets into the scenes folder (assets/scenes)",
      );
    }
    const database = await this.store.load();
    const errors: Array<{ fileName: string; message: string }> = [];
    const prepared: PreparedAssetImport[] = [];

    const allocator = new ImportPathAllocator(destination);
    for (const asset of database.getAll()) {
      for (const assetPath of ownedAssetPaths(asset)) {
        allocator.registerExistingAssetPath(assetPath);
      }
    }

    const context = {
      destinationFolder: destination,
      allocateRelativePath: (desiredFileName: string) =>
        allocator.allocateRelativePath(desiredFileName),
      allocateUniqueFolder: (desiredFolderName: string) =>
        allocator.allocateUniqueFolder(desiredFolderName),
    };

    let remaining: readonly ImportFile[] = files;
    for (const bundleImporter of this.registry.listBundles()) {
      const partitioned = bundleImporter.partition(remaining);
      errors.push(...partitioned.errors);
      remaining = partitioned.remaining;
      for (const bundle of partitioned.bundles) {
        try {
          prepared.push(await bundleImporter.prepareBundle(bundle, context));
        } catch (error) {
          errors.push({
            fileName: bundle[0]?.fileName ?? bundleImporter.id,
            message: error instanceof Error ? error.message : "Import failed",
          });
        }
      }
    }

    for (const file of remaining) {
      const importer = this.registry.find(file);
      if (!importer) {
        errors.push({
          fileName: file.fileName,
          message: `Unsupported file type: ${file.fileName}`,
        });
        continue;
      }

      try {
        prepared.push(await importer.prepare(file, context));
      } catch (error) {
        errors.push({
          fileName: file.fileName,
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    if (prepared.length === 0) {
      throw new DomainError(
        "ASSET_IMPORT_FAILED",
        errors.map((e) => e.message).join("; ") || "No files imported",
      );
    }

    const batchId = createId("import");
    const stagingRootRelative = path.posix.join(".project", "import-tmp", batchId);
    const stagingRootAbsolute =
      this.projectService.resolveProjectPath(stagingRootRelative);
    const committedAbsolutePaths: string[] = [];

    try {
      await mkdir(stagingRootAbsolute, { recursive: true });

      for (const item of prepared) {
        for (const file of item.files) {
          const stagedAbsolute = path.join(
            stagingRootAbsolute,
            ...file.relativePath.split("/"),
          );
          await mkdir(path.dirname(stagedAbsolute), { recursive: true });
          await writeFile(stagedAbsolute, file.bytes);
        }
      }

      const imported: AssetRecord[] = [];
      for (const item of prepared) {
        for (const file of item.files) {
          const stagedAbsolute = path.join(
            stagingRootAbsolute,
            ...file.relativePath.split("/"),
          );
          const finalAbsolute = this.projectService.resolveProjectPath(
            file.relativePath,
          );
          await mkdir(path.dirname(finalAbsolute), { recursive: true });
          await rename(stagedAbsolute, finalAbsolute);
          committedAbsolutePaths.push(finalAbsolute);
        }
        if (this.asepriteCompile && item.record.type === "aseprite") {
          const compiled = await this.asepriteCompile.ensureCompiled(item.record);
          if (compiled.error) {
            errors.push({
              fileName: item.record.path,
              message: compiled.error,
            });
          }
          database.add(compiled.record);
          imported.push(compiled.record);
        } else {
          database.add(item.record);
          imported.push(item.record);
        }
      }

      const databaseJson = await this.store.save(database);
      return {
        imported,
        errors,
        database: databaseJson,
        revision: computeAssetDatabaseRevision(databaseJson),
      };
    } catch (error) {
      for (const absolute of committedAbsolutePaths) {
        await rm(absolute, { force: true }).catch(() => undefined);
      }
      throw error;
    } finally {
      await rm(stagingRootAbsolute, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }
}
