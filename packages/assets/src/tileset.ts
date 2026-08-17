/**
 * TileSet geometry: divide a source texture into atlas regions.
 * Individual tiles are never separate catalogue assets.
 */

import type { TileSetAssetMetadata } from "./types.js";

export const TILESET_SCHEMA_VERSION = 1 as const;
export const DEFAULT_TILESET_TILE_SIZE = 32;
export const TILESET_FILE_SUFFIX = ".tileset.json";

export interface TileAnimationFrame {
  /** Atlas tile whose static region is shown for this frame. */
  tileId: number;
  /** Frame length in milliseconds. */
  duration: number;
}

export interface TileAnimationDefinition {
  frames: TileAnimationFrame[];
  /** Default true when omitted. */
  loop?: boolean;
}

export interface TileDefinition {
  name?: string;
  tags?: string[];
  animation?: TileAnimationDefinition;
}

/** Persisted TileSet document (`.tileset.json`). */
export interface TileSetData {
  version: number;
  id: string;
  name: string;
  imageAssetId: string;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
  columns: number;
  rows: number;
  tiles?: Record<string, TileDefinition>;
}

export interface TileSetGridInput {
  imageWidth: number;
  imageHeight: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
}

export interface TileRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeTileSetGrid(input: TileSetGridInput): {
  columns: number;
  rows: number;
} {
  if (!(input.tileWidth > 0) || !(input.tileHeight > 0)) {
    return { columns: 0, rows: 0 };
  }
  const innerWidth = input.imageWidth - input.margin * 2;
  const innerHeight = input.imageHeight - input.margin * 2;
  const strideX = input.tileWidth + input.spacing;
  const strideY = input.tileHeight + input.spacing;
  if (
    innerWidth < input.tileWidth ||
    innerHeight < input.tileHeight ||
    strideX <= 0 ||
    strideY <= 0
  ) {
    return { columns: 0, rows: 0 };
  }
  return {
    columns: Math.max(0, Math.floor((innerWidth + input.spacing) / strideX)),
    rows: Math.max(0, Math.floor((innerHeight + input.spacing) / strideY)),
  };
}

export function tileCount(columns: number, rows: number): number {
  return Math.max(0, columns) * Math.max(0, rows);
}

export function tileIdToColumnRow(
  tileId: number,
  columns: number,
): { column: number; row: number } | undefined {
  if (!(columns > 0) || !Number.isInteger(tileId) || tileId < 0) {
    return undefined;
  }
  return {
    column: tileId % columns,
    row: Math.floor(tileId / columns),
  };
}

export function tileRegion(input: {
  tileId: number;
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
}): TileRegion | undefined {
  const coords = tileIdToColumnRow(input.tileId, input.columns);
  if (
    !coords ||
    coords.row < 0 ||
    coords.row >= input.rows ||
    !(input.tileWidth > 0) ||
    !(input.tileHeight > 0)
  ) {
    return undefined;
  }
  return {
    x: input.margin + coords.column * (input.tileWidth + input.spacing),
    y: input.margin + coords.row * (input.tileHeight + input.spacing),
    width: input.tileWidth,
    height: input.tileHeight,
  };
}

export function isValidTileId(
  tileId: number,
  columns: number,
  rows: number,
): boolean {
  return (
    Number.isInteger(tileId) &&
    tileId >= 0 &&
    tileId < tileCount(columns, rows)
  );
}

/** Logical tile under a pixel in atlas space, or undefined in margin/spacing. */
export function tileIdAtPixel(input: {
  x: number;
  y: number;
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
}): number | undefined {
  if (
    !(input.tileWidth > 0) ||
    !(input.tileHeight > 0) ||
    input.columns <= 0 ||
    input.rows <= 0
  ) {
    return undefined;
  }
  const innerX = input.x - input.margin;
  const innerY = input.y - input.margin;
  if (innerX < 0 || innerY < 0) {
    return undefined;
  }
  const strideX = input.tileWidth + input.spacing;
  const strideY = input.tileHeight + input.spacing;
  if (strideX <= 0 || strideY <= 0) {
    return undefined;
  }
  const column = Math.floor(innerX / strideX);
  const row = Math.floor(innerY / strideY);
  if (column < 0 || column >= input.columns || row < 0 || row >= input.rows) {
    return undefined;
  }
  const localX = innerX - column * strideX;
  const localY = innerY - row * strideY;
  if (localX >= input.tileWidth || localY >= input.tileHeight) {
    return undefined;
  }
  return row * input.columns + column;
}

export function tileSetConfigKey(tileset: {
  imageAssetId: string;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
  columns: number;
  rows: number;
  tiles?: Record<string, TileDefinition>;
}): string {
  return [
    tileset.imageAssetId,
    String(tileset.tileWidth),
    String(tileset.tileHeight),
    String(tileset.margin),
    String(tileset.spacing),
    String(tileset.columns),
    String(tileset.rows),
    tileAnimationConfigKey(tileset.tiles),
  ].join(":");
}

function tileAnimationConfigKey(
  tiles: Record<string, TileDefinition> | undefined,
): string {
  if (!tiles) {
    return "";
  }
  const parts: string[] = [];
  for (const id of Object.keys(tiles).sort()) {
    const animation = tiles[id]?.animation;
    if (!animation?.frames.length) {
      continue;
    }
    const loop = animation.loop === false ? "0" : "1";
    parts.push(
      `${id}=${loop}:${animation.frames
        .map((frame) => `${String(frame.tileId)}/${String(frame.duration)}`)
        .join(",")}`,
    );
  }
  return parts.join(";");
}

export function tileSetMetadataFromData(data: TileSetData): TileSetAssetMetadata {
  const metadata: TileSetAssetMetadata = {
    kind: "tileset",
    tilesetId: data.id,
    imageAssetId: data.imageAssetId,
    tileWidth: data.tileWidth,
    tileHeight: data.tileHeight,
    margin: data.margin,
    spacing: data.spacing,
    columns: data.columns,
    rows: data.rows,
  };
  if (data.tiles && Object.keys(data.tiles).length > 0) {
    metadata.tiles = data.tiles;
  }
  return metadata;
}

export function tileSetDataFromRecord(
  name: string,
  metadata: TileSetAssetMetadata,
  tiles?: Record<string, TileDefinition>,
): TileSetData {
  const resolvedTiles = tiles ?? metadata.tiles;
  const data: TileSetData = {
    version: TILESET_SCHEMA_VERSION,
    id: metadata.tilesetId,
    name,
    imageAssetId: metadata.imageAssetId,
    tileWidth: metadata.tileWidth,
    tileHeight: metadata.tileHeight,
    margin: metadata.margin,
    spacing: metadata.spacing,
    columns: metadata.columns,
    rows: metadata.rows,
  };
  if (resolvedTiles !== undefined) {
    data.tiles = resolvedTiles;
  }
  return data;
}

export function tileSetResolvedFromMetadata(metadata: TileSetAssetMetadata): {
  imageAssetId: string;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
  columns: number;
  rows: number;
  tiles?: Record<string, TileDefinition>;
} {
  return {
    imageAssetId: metadata.imageAssetId,
    tileWidth: metadata.tileWidth,
    tileHeight: metadata.tileHeight,
    margin: metadata.margin,
    spacing: metadata.spacing,
    columns: metadata.columns,
    rows: metadata.rows,
    ...(metadata.tiles ? { tiles: metadata.tiles } : {}),
  };
}
