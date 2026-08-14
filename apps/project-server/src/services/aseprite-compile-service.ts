import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  asepriteCliJsonToPixiSpritesheet,
  asepriteCompileRevision,
  asepriteFrameNamespace,
  derivedAsepritePaths,
  getFileBasename,
  isAsepriteCliJson,
  normalizeAsepriteMetadata,
  parseAsepriteCliJsonBytes,
  type AssetDatabase,
  type AssetRecord,
} from "@game-editor/assets";
import { DomainError } from "@game-editor/core";
import type { ProjectService } from "./project-service.js";
import { ASEPRITE_CLI_MISSING_MESSAGE } from "./aseprite-service.js";
import type { AsepriteCacheData, AsepriteCacheStore } from "./aseprite-cache.js";

export interface AsepriteCompileBatchResult {
  changed: boolean;
  errors: Array<{ fileName: string; message: string }>;
}

export interface AsepriteExporter {
  isAvailable(): Promise<boolean>;
  exportSheet(sourcePath: string, sheetPath: string, dataPath: string): Promise<void>;
}

/**
 * Incremental Aseprite → PNG/JSON processor. Skips CLI when source mtime/size
 * match the cache and generated files still exist.
 */
export class AsepriteCompileService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly aseprite: AsepriteExporter,
    private readonly cacheStore: AsepriteCacheStore,
  ) {}

  async processDatabase(database: AssetDatabase): Promise<AsepriteCompileBatchResult> {
    const cache = await this.cacheStore.load();
    const errors: Array<{ fileName: string; message: string }> = [];
    let changed = false;
    let cacheDirty = false;

    for (const record of [...database.getAll()]) {
      if (record.metadata.kind !== "aseprite") {
        continue;
      }
      const result = await this.ensureCompiled(record, cache);
      cacheDirty = cacheDirty || result.cacheDirty;
      if (result.error) {
        errors.push({ fileName: record.path, message: result.error });
      }
      if (result.record !== record) {
        database.update(result.record);
        changed = true;
      }
    }

    if (cacheDirty) {
      await this.cacheStore.save(cache);
    }
    return { changed, errors };
  }

  async ensureCompiled(
    record: AssetRecord,
    cache?: AsepriteCacheData,
  ): Promise<{ record: AssetRecord; cacheDirty: boolean; error?: string }> {
    if (record.metadata.kind !== "aseprite") {
      return { record, cacheDirty: false };
    }

    const ownedCache = cache ?? (await this.cacheStore.load());
    const persistCache = cache === undefined;

    const finish = async (result: {
      record: AssetRecord;
      cacheDirty: boolean;
      error?: string;
    }): Promise<{ record: AssetRecord; cacheDirty: boolean; error?: string }> => {
      if (persistCache && result.cacheDirty) {
        await this.cacheStore.save(ownedCache);
      }
      return result;
    };

    const sourceAbsolute = this.projectService.resolveProjectPath(record.path);
    let sourceStat;
    try {
      sourceStat = await stat(sourceAbsolute);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Aseprite source is missing";
      return finish({
        record: withCompileError(record, message),
        cacheDirty: false,
        error: message,
      });
    }

    const sourceMtime = sourceStat.mtimeMs;
    const sourceSize = sourceStat.size;
    const compileRevision = asepriteCompileRevision(sourceMtime, sourceSize);
    const cached = ownedCache.entries[record.path];
    const generated = derivedAsepritePaths(record);
    const generatedExist = await allExist(this.projectService, generated);

    if (
      this.cacheStore.isFresh(cached, sourceMtime, sourceSize) &&
      generatedExist &&
      record.metadata.compileRevision === compileRevision &&
      record.metadata.compileError === undefined
    ) {
      return finish({ record, cacheDirty: false });
    }

    if (!(await this.aseprite.isAvailable())) {
      return finish({
        record: withCompileError(record, ASEPRITE_CLI_MISSING_MESSAGE),
        cacheDirty: false,
        error: ASEPRITE_CLI_MISSING_MESSAGE,
      });
    }

    try {
      const sheetAbsolute = this.projectService.resolveProjectPath(
        record.metadata.sheetPath,
      );
      const dataAbsolute = this.projectService.resolveProjectPath(
        record.metadata.dataPath,
      );
      await mkdir(path.dirname(sheetAbsolute), { recursive: true });
      await mkdir(path.dirname(dataAbsolute), { recursive: true });
      await this.aseprite.exportSheet(sourceAbsolute, sheetAbsolute, dataAbsolute);

      const cliBytes = await readFile(dataAbsolute);
      const parsed = parseAsepriteCliJsonBytes(cliBytes);
      if (!isAsepriteCliJson(parsed)) {
        throw new DomainError(
          "ASEPRITE_EXPORT_INVALID",
          `Aseprite did not write valid JSON for ${record.path}`,
        );
      }
      const pixiJson = asepriteCliJsonToPixiSpritesheet(
        parsed,
        getFileBasename(record.metadata.sheetPath),
        asepriteFrameNamespace(record.path),
      );
      await writeFile(dataAbsolute, `${JSON.stringify(pixiJson, null, 2)}\n`, "utf8");
      const metadata = normalizeAsepriteMetadata(
        parsed,
        {
          sheetPath: record.metadata.sheetPath,
          dataPath: record.metadata.dataPath,
        },
        compileRevision,
      );

      ownedCache.entries[record.path] = {
        source: record.path,
        sourceMtime,
        sourceSize,
        generatedFiles: generated,
        compileRevision,
      };

      return finish({
        record: { ...record, metadata },
        cacheDirty: true,
      });
    } catch (error) {
      const message =
        error instanceof DomainError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Aseprite export failed";
      return finish({
        record: withCompileError(record, message),
        cacheDirty: false,
        error: message,
      });
    }
  }
}

function withCompileError(record: AssetRecord, message: string): AssetRecord {
  if (record.metadata.kind !== "aseprite") {
    return record;
  }
  if (record.metadata.compileError === message) {
    return record;
  }
  return {
    ...record,
    metadata: {
      ...record.metadata,
      compileError: message,
    },
  };
}

async function allExist(
  project: ProjectService,
  relativePaths: readonly string[],
): Promise<boolean> {
  for (const relative of relativePaths) {
    try {
      await access(project.resolveProjectPath(relative));
    } catch {
      return false;
    }
  }
  return relativePaths.length > 0;
}
