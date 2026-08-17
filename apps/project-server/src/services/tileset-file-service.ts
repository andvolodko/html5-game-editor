import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  computeTileSetGrid,
  createTileSetAssetRecord,
  DEFAULT_TILESET_TILE_SIZE,
  normalizeProjectRelativePath,
  parseTileSetData,
  rasterAssetDisplaySize,
  serializeTileSetData,
  TILESET_FILE_SUFFIX,
  TILESET_SCHEMA_VERSION,
  tileSetMetadataFromData,
  type TileSetData,
} from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import { createId } from "@game-editor/shared";
import type { AssetDatabaseStore } from "./asset-database-store.js";
import type { ProjectService } from "./project-service.js";

const TILESET_STEM_PATTERN = /^[A-Za-z0-9._-]+$/;

function sanitizeTileSetStem(name: string): string {
  const stem = name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return stem.length > 0 ? stem : "TileSet";
}

function assertSafeTileSetStem(stem: string): void {
  if (!TILESET_STEM_PATTERN.test(stem)) {
    throw new DomainError("INVALID_TILESET_NAME", `Invalid TileSet name: ${stem}`);
  }
}

export class TileSetFileService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly assetDatabaseStore: AssetDatabaseStore,
  ) {}

  async createTileSet(input: {
    name: string;
    imageAssetId: string;
    tileWidth?: number;
    tileHeight?: number;
    margin?: number;
    spacing?: number;
    destination?: string;
  }): Promise<{ asset: ReturnType<typeof createTileSetAssetRecord>; tileset: TileSetData }> {
    const stem = sanitizeTileSetStem(input.name);
    assertSafeTileSetStem(stem);
    const database = await this.assetDatabaseStore.load();
    const image = database.get(input.imageAssetId);
    if (!image || image.type !== "texture") {
      throw new DomainError(
        "TEXTURE_NOT_FOUND",
        `Texture asset not found: ${input.imageAssetId}`,
      );
    }
    const size = rasterAssetDisplaySize(image);
    const tileWidth = input.tileWidth ?? DEFAULT_TILESET_TILE_SIZE;
    const tileHeight = input.tileHeight ?? DEFAULT_TILESET_TILE_SIZE;
    const margin = input.margin ?? 0;
    const spacing = input.spacing ?? 0;
    const grid = computeTileSetGrid({
      imageWidth: size?.width ?? tileWidth,
      imageHeight: size?.height ?? tileHeight,
      tileWidth,
      tileHeight,
      margin,
      spacing,
    });
    const tileset: TileSetData = parseTileSetData({
      version: TILESET_SCHEMA_VERSION,
      id: createId("tileset"),
      name: input.name.trim() || stem,
      imageAssetId: input.imageAssetId,
      tileWidth,
      tileHeight,
      margin,
      spacing,
      columns: grid.columns,
      rows: grid.rows,
    });
    const destination = this.resolveDestination(input.destination, stem);
    const relative = normalizeProjectRelativePath(destination);
    this.projectService.resolveProjectPath(relative);
    const uniqueRelative = await this.allocateUniquePath(relative);
    const record = createTileSetAssetRecord({
      name: tileset.name,
      path: uniqueRelative,
      tilesetId: tileset.id,
      imageAssetId: tileset.imageAssetId,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
      margin: tileset.margin,
      spacing: tileset.spacing,
      columns: tileset.columns,
      rows: tileset.rows,
    });
    await this.writeTileSetFile(uniqueRelative, tileset);
    database.add(record);
    await this.assetDatabaseStore.save(database);
    return { asset: record, tileset };
  }

  async saveTileSet(assetId: string, input: unknown): Promise<TileSetData> {
    const database = await this.assetDatabaseStore.load();
    const record = database.get(assetId);
    if (!record || record.type !== "tileset") {
      throw new DomainError("TILESET_NOT_FOUND", `TileSet asset not found: ${assetId}`);
    }
    const tileset = parseTileSetData(input);
    await this.writeTileSetFile(record.path, tileset);
    if (record.metadata.kind === "tileset") {
      database.update({
        ...record,
        name: tileset.name,
        metadata: tileSetMetadataFromData(tileset),
      });
      await this.assetDatabaseStore.save(database);
    }
    return tileset;
  }

  async loadTileSet(assetId: string): Promise<TileSetData> {
    const database = await this.assetDatabaseStore.load();
    const record = database.get(assetId);
    if (!record || record.type !== "tileset") {
      throw new DomainError("TILESET_NOT_FOUND", `TileSet asset not found: ${assetId}`);
    }
    const absolute = this.projectService.resolveProjectPath(record.path);
    let raw: string;
    try {
      raw = await readFile(absolute, "utf8");
    } catch (error) {
      throw new DomainError("TILESET_NOT_FOUND", `TileSet file missing: ${record.path}`, {
        cause: error,
      });
    }
    try {
      return parseTileSetData(JSON.parse(raw) as unknown);
    } catch (error) {
      throw new ValidationError(`TileSet failed schema validation: ${assetId}`, {
        cause: error,
      });
    }
  }

  private resolveDestination(destination: string | undefined, stem: string): string {
    if (destination === undefined || destination.length === 0) {
      return `assets/${stem}${TILESET_FILE_SUFFIX}`;
    }
    const normalized = normalizeProjectRelativePath(destination);
    if (normalized.startsWith("..") || !normalized.startsWith("assets/")) {
      throw new DomainError("PATH_ESCAPE", `Invalid TileSet destination: ${destination}`);
    }
    if (normalized.endsWith(TILESET_FILE_SUFFIX) || normalized.endsWith(".json")) {
      return normalized;
    }
    return `${normalized.replace(/\/$/, "")}/${stem}${TILESET_FILE_SUFFIX}`;
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

  private async writeTileSetFile(relative: string, tileset: TileSetData): Promise<void> {
    const absolute = this.projectService.resolveProjectPath(relative);
    const tempAbsolute = `${absolute}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(tempAbsolute, serializeTileSetData(tileset), "utf8");
    await rename(tempAbsolute, absolute);
  }
}
