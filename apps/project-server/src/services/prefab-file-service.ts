import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPrefabAssetRecord, normalizeProjectRelativePath } from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import {
  parsePrefabData,
  PREFAB_SCHEMA_VERSION,
  serializePrefabData,
  type PrefabData,
} from "@game-editor/scene";
import { createId } from "@game-editor/shared";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import type { ProjectService } from "./project-service.js";

export const PREFABS_DIR = "assets/prefabs";

const PREFAB_STEM_PATTERN = /^[A-Za-z0-9._-]+$/;

function sanitizePrefabStem(name: string): string {
  const stem = name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return stem.length > 0 ? stem : "Prefab";
}

function assertSafePrefabStem(stem: string): void {
  if (!PREFAB_STEM_PATTERN.test(stem)) {
    throw new DomainError("INVALID_PREFAB_NAME", `Invalid prefab name: ${stem}`);
  }
}

export class PrefabFileService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly assetDatabaseStore: AssetDatabaseStore,
  ) {}

  async createPrefab(input: {
    name: string;
    root: unknown;
    destination?: string;
  }): Promise<{ asset: ReturnType<typeof createPrefabAssetRecord>; prefab: PrefabData }> {
    const stem = sanitizePrefabStem(input.name);
    assertSafePrefabStem(stem);
    const prefab: PrefabData = parsePrefabData({
      version: PREFAB_SCHEMA_VERSION,
      id: createId("prefab"),
      name: input.name.trim() || stem,
      root: input.root,
    });
    const destination = this.resolveDestination(input.destination, stem);
    const relative = normalizeProjectRelativePath(destination);
    this.projectService.resolveProjectPath(relative);
    const uniqueRelative = await this.allocateUniquePath(relative);
    const record = createPrefabAssetRecord({
      name: prefab.name,
      path: uniqueRelative,
      prefabId: prefab.id,
    });
    await this.writePrefabFile(uniqueRelative, prefab);
    const database = await this.assetDatabaseStore.load();
    database.add(record);
    await this.assetDatabaseStore.save(database);
    return { asset: record, prefab };
  }

  async savePrefab(assetId: string, input: unknown): Promise<PrefabData> {
    const database = await this.assetDatabaseStore.load();
    const record = database.get(assetId);
    if (!record || record.type !== "prefab") {
      throw new DomainError("PREFAB_NOT_FOUND", `Prefab asset not found: ${assetId}`);
    }
    const prefab = parsePrefabData(input);
    await this.writePrefabFile(record.path, prefab);
    if (record.metadata.kind === "prefab" && record.metadata.prefabId !== prefab.id) {
      database.update({
        ...record,
        metadata: { kind: "prefab", prefabId: prefab.id },
      });
      await this.assetDatabaseStore.save(database);
    }
    return prefab;
  }

  async loadPrefab(assetId: string): Promise<PrefabData> {
    const database = await this.assetDatabaseStore.load();
    const record = database.get(assetId);
    if (!record || record.type !== "prefab") {
      throw new DomainError("PREFAB_NOT_FOUND", `Prefab asset not found: ${assetId}`);
    }
    const absolute = this.projectService.resolveProjectPath(record.path);
    let raw: string;
    try {
      raw = await readFile(absolute, "utf8");
    } catch (error) {
      throw new DomainError("PREFAB_NOT_FOUND", `Prefab file missing: ${record.path}`, {
        cause: error,
      });
    }
    try {
      return parsePrefabData(JSON.parse(raw) as unknown);
    } catch (error) {
      throw new ValidationError(`Prefab failed schema validation: ${assetId}`, {
        cause: error,
      });
    }
  }

  private resolveDestination(destination: string | undefined, stem: string): string {
    if (destination === undefined || destination.length === 0) {
      return `${PREFABS_DIR}/${stem}.prefab.json`;
    }
    const normalized = normalizeProjectRelativePath(destination);
    if (normalized.startsWith("..") || !normalized.startsWith("assets/")) {
      throw new DomainError("PATH_ESCAPE", `Invalid prefab destination: ${destination}`);
    }
    if (normalized.endsWith(".prefab.json") || normalized.endsWith(".json")) {
      return normalized;
    }
    return `${normalized.replace(/\/$/, "")}/${stem}.prefab.json`;
  }

  private async allocateUniquePath(relative: string): Promise<string> {
    if (!(await this.assetDatabaseStore.exists(relative))) {
      return relative;
    }
    const parsed = path.posix.parse(relative);
    let suffix = 2;
    while (true) {
      const candidate = `${parsed.dir}/${parsed.name}-${String(suffix)}${parsed.ext}`;
      if (!(await this.assetDatabaseStore.exists(candidate))) {
        return candidate;
      }
      suffix += 1;
    }
  }

  private async writePrefabFile(relative: string, prefab: PrefabData): Promise<void> {
    const absolute = this.projectService.resolveProjectPath(relative);
    const tempAbsolute = `${absolute}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(tempAbsolute, serializePrefabData(prefab), "utf8");
    await rename(tempAbsolute, absolute);
  }
}
