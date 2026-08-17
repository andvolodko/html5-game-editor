import type { AssetDatabaseData, AssetMetadata, AssetRecord, AsepriteTagMetadata } from "./types.js";
import type { TileDefinition } from "./tileset.js";
import {
  createEmptyAssetDatabase,
  normalizeProjectRelativePath,
} from "./factories.js";
import { parseAssetDatabase, serializeAssetDatabase } from "./schema.js";

/**
 * In-memory asset index. Owned by editor/server context — not a global singleton.
 * Paths are project-relative; assetId is the canonical reference.
 */
export class AssetDatabase {
  private data: AssetDatabaseData = createEmptyAssetDatabase();
  private byId = new Map<string, AssetRecord>();
  private byPath = new Map<string, AssetRecord>();

  constructor(data: AssetDatabaseData = createEmptyAssetDatabase()) {
    this.replaceAll(data);
  }

  static fromUnknown(input: unknown): AssetDatabase {
    return new AssetDatabase(parseAssetDatabase(input));
  }

  getAll(): readonly AssetRecord[] {
    return this.data.assets;
  }

  get(assetId: string): AssetRecord | undefined {
    return this.byId.get(assetId);
  }

  has(assetId: string): boolean {
    return this.byId.has(assetId);
  }

  add(record: AssetRecord): void {
    if (this.byId.has(record.id)) {
      throw new Error(`AssetDatabase: duplicate asset id ${record.id}`);
    }
    const pathKey = normalizeProjectRelativePath(record.path);
    if (this.byPath.has(pathKey)) {
      throw new Error(`AssetDatabase: duplicate asset path ${pathKey}`);
    }
    this.data = {
      version: this.data.version,
      assets: [...this.data.assets, record].sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
    };
    this.rebuildIndexes();
  }

  update(record: AssetRecord): void {
    const index = this.data.assets.findIndex((asset) => asset.id === record.id);
    if (index < 0) {
      throw new Error(`AssetDatabase: unknown asset id ${record.id}`);
    }
    const previous = this.data.assets[index]!;
    const prevPath = normalizeProjectRelativePath(previous.path);
    const nextPath = normalizeProjectRelativePath(record.path);
    if (prevPath !== nextPath && this.byPath.has(nextPath)) {
      throw new Error(`AssetDatabase: duplicate asset path ${nextPath}`);
    }
    const assets = [...this.data.assets];
    assets[index] = record;
    assets.sort((a, b) => a.id.localeCompare(b.id));
    this.data = { version: this.data.version, assets };
    this.rebuildIndexes();
  }

  remove(assetId: string): boolean {
    const index = this.data.assets.findIndex((asset) => asset.id === assetId);
    if (index < 0) {
      return false;
    }
    const assets = this.data.assets.filter((asset) => asset.id !== assetId);
    this.data = { version: this.data.version, assets };
    this.rebuildIndexes();
    return true;
  }

  /** Project-relative path for an asset id, if present. */
  resolvePath(assetId: string): string | undefined {
    return this.byId.get(assetId)?.path;
  }

  findByPath(pathValue: string): AssetRecord | undefined {
    return this.byPath.get(normalizeProjectRelativePath(pathValue));
  }

  replaceAll(data: AssetDatabaseData): void {
    const parsed = parseAssetDatabase(data);
    this.data = {
      version: parsed.version,
      assets: [...parsed.assets].sort((a, b) => a.id.localeCompare(b.id)),
    };
    this.rebuildIndexes();
  }

  /**
   * Apply a catalogue snapshot while preserving `AssetRecord` object identity
   * for unchanged ids. Returns whether the visible catalogue changed.
   */
  applySnapshot(data: AssetDatabaseData): boolean {
    const parsed = parseAssetDatabase(data);
    const nextAssets = parsed.assets
      .map((incoming) => {
        const previous = this.byId.get(incoming.id);
        return previous && assetRecordsEquivalent(previous, incoming)
          ? previous
          : incoming;
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const unchanged =
      this.data.version === parsed.version &&
      this.data.assets.length === nextAssets.length &&
      this.data.assets.every((asset, index) => asset === nextAssets[index]);

    if (unchanged) {
      return false;
    }

    this.data = {
      version: parsed.version,
      assets: nextAssets,
    };
    this.rebuildIndexes();
    return true;
  }

  toJSON(): AssetDatabaseData {
    return {
      version: this.data.version,
      assets: [...this.data.assets],
    };
  }

  serialize(): string {
    return serializeAssetDatabase(this.toJSON());
  }

  private rebuildIndexes(): void {
    this.byId = new Map(this.data.assets.map((asset) => [asset.id, asset]));
    this.byPath = new Map(
      this.data.assets.map((asset) => [
        normalizeProjectRelativePath(asset.path),
        asset,
      ]),
    );
  }
}

/** Structural equality for catalogue rows (used to keep stable object refs). */
export function assetRecordsEquivalent(
  left: AssetRecord,
  right: AssetRecord,
): boolean {
  if (left === right) {
    return true;
  }
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.name === right.name &&
    left.path === right.path &&
    assetMetadataEquivalent(left.metadata, right.metadata)
  );
}

function assetMetadataEquivalent(
  left: AssetMetadata,
  right: AssetMetadata,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "texture" && right.kind === "texture") {
    return (
      left.width === right.width &&
      left.height === right.height &&
      left.mimeType === right.mimeType
    );
  }
  if (left.kind === "spine" && right.kind === "spine") {
    return (
      left.skeletonFormat === right.skeletonFormat &&
      left.atlasPath === right.atlasPath &&
      stringArraysEqual(left.pagePaths, right.pagePaths) &&
      stringArraysEqual(left.skins, right.skins) &&
      stringArraysEqual(left.animations, right.animations)
    );
  }
  if (left.kind === "audio" && right.kind === "audio") {
    return left.mimeType === right.mimeType;
  }
  if (left.kind === "gltf" && right.kind === "gltf") {
    return (
      left.mimeType === right.mimeType &&
      left.format === right.format &&
      stringArraysEqual(left.animations, right.animations) &&
      stringArraysEqual(left.bufferPaths ?? [], right.bufferPaths ?? []) &&
      stringArraysEqual(left.imagePaths ?? [], right.imagePaths ?? [])
    );
  }
  if (left.kind === "aseprite" && right.kind === "aseprite") {
    return (
      left.width === right.width &&
      left.height === right.height &&
      left.frameCount === right.frameCount &&
      left.sheetPath === right.sheetPath &&
      left.dataPath === right.dataPath &&
      left.compileRevision === right.compileRevision &&
      left.compileError === right.compileError &&
      asepriteTagsEqual(left.tags, right.tags) &&
      numbersEqual(left.frameDurations, right.frameDurations)
    );
  }
  if (left.kind === "font" && right.kind === "font") {
    return (
      left.fontFamily === right.fontFamily &&
      stringArraysEqual(left.pagePaths, right.pagePaths)
    );
  }
  if (left.kind === "webfont" && right.kind === "webfont") {
    return (
      left.fontFamily === right.fontFamily &&
      left.mimeType === right.mimeType &&
      left.format === right.format
    );
  }
  if (left.kind === "prefab" && right.kind === "prefab") {
    return left.prefabId === right.prefabId;
  }
  if (left.kind === "tileset" && right.kind === "tileset") {
    return (
      left.tilesetId === right.tilesetId &&
      left.imageAssetId === right.imageAssetId &&
      left.tileWidth === right.tileWidth &&
      left.tileHeight === right.tileHeight &&
      left.margin === right.margin &&
      left.spacing === right.spacing &&
      left.columns === right.columns &&
      left.rows === right.rows &&
      tileDefinitionsEquivalent(left.tiles, right.tiles)
    );
  }
  return false;
}

function tileDefinitionsEquivalent(
  left: Record<string, TileDefinition> | undefined,
  right: Record<string, TileDefinition> | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return !left && !right;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) {
      return false;
    }
    return JSON.stringify(left[key]) === JSON.stringify(right[key]);
  });
}

function asepriteTagsEqual(
  left: readonly AsepriteTagMetadata[],
  right: readonly AsepriteTagMetadata[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((tag, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      tag.name === other.name &&
      tag.from === other.from &&
      tag.to === other.to &&
      tag.direction === other.direction
    );
  });
}

function numbersEqual(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function stringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}
