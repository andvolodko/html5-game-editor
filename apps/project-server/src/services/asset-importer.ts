import type { AssetRecord } from "@game-editor/assets";

export interface ImportFile {
  fileName: string;
  bytes: Buffer;
}

export interface ImportPrepareContext {
  /** Normalized destination folder under assets/. */
  destinationFolder: string;
  /**
   * Allocate a unique project-relative path for the desired file name.
   * Nested relative paths (from dropped folders) are preserved under the destination.
   * Updates uniqueness tracking for subsequent files in the same batch.
   */
  allocateRelativePath: (desiredFileName: string) => string;
  /**
   * Allocate a unique folder under the destination (for multi-file bundles).
   * Nested relative folder paths are preserved.
   */
  allocateUniqueFolder: (desiredFolderName: string) => string;
}

export interface PreparedAssetFile {
  relativePath: string;
  bytes: Buffer;
}

export interface PreparedAssetImport {
  record: AssetRecord;
  files: PreparedAssetFile[];
}

/**
 * Pluggable importer (PROJECT.md §17).
 * Implementations must not write to disk — AssetImportService commits transactionally.
 */
export interface AssetImporter {
  readonly id: string;
  supports(file: ImportFile): boolean;
  prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport>;
}

export interface AssetBundlePartition {
  bundles: ImportFile[][];
  remaining: ImportFile[];
  errors: Array<{ fileName: string; message: string }>;
}

/**
 * Multi-file importer (Spine, etc.). Runs before per-file importers so a
 * complete set is claimed as one AssetRecord.
 */
export interface AssetBundleImporter {
  readonly id: string;
  partition(files: readonly ImportFile[]): AssetBundlePartition;
  prepareBundle(
    files: readonly ImportFile[],
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport>;
}

export class AssetImporterRegistry {
  private readonly importers: AssetImporter[] = [];
  private readonly bundleImporters: AssetBundleImporter[] = [];

  register(importer: AssetImporter): void {
    if (this.importers.some((entry) => entry.id === importer.id)) {
      throw new Error(`AssetImporterRegistry: duplicate importer id ${importer.id}`);
    }
    this.importers.push(importer);
  }

  registerBundle(importer: AssetBundleImporter): void {
    if (this.bundleImporters.some((entry) => entry.id === importer.id)) {
      throw new Error(
        `AssetImporterRegistry: duplicate bundle importer id ${importer.id}`,
      );
    }
    this.bundleImporters.push(importer);
  }

  find(file: ImportFile): AssetImporter | undefined {
    return this.importers.find((importer) => importer.supports(file));
  }

  list(): readonly AssetImporter[] {
    return this.importers;
  }

  listBundles(): readonly AssetBundleImporter[] {
    return this.bundleImporters;
  }
}
