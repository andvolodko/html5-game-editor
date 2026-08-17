import { createId } from "@game-editor/shared";
import {
  chunkCellCount,
  chunkCoord,
  chunkKey,
  chunkLocalCoord,
  DEFAULT_TILEMAP_LAYER_NAME,
  EMPTY_TILE,
  isChunkEmpty,
  TILEMAP_CHUNK_SIZE,
  type TileChange,
  type TileChunkData,
  type TilemapComponentData,
  type TilemapLayerData,
} from "./tilemap-data.js";

export function getTilemapLayer(
  tilemap: TilemapComponentData,
  layerId: string,
): TilemapLayerData | undefined {
  return tilemap.layers.find((layer) => layer.id === layerId);
}

export function primaryTilemapLayer(
  tilemap: TilemapComponentData,
): TilemapLayerData | undefined {
  return tilemap.layers[0];
}

export function getTile(
  tilemap: TilemapComponentData,
  layerId: string,
  x: number,
  y: number,
): number {
  const layer = getTilemapLayer(tilemap, layerId);
  if (!layer) {
    return EMPTY_TILE;
  }
  const chunk = findChunk(layer, chunkCoord(x), chunkCoord(y));
  if (!chunk) {
    return EMPTY_TILE;
  }
  return tileAt(chunk, chunkLocalCoord(x), chunkLocalCoord(y));
}

export function setTile(
  tilemap: TilemapComponentData,
  layerId: string,
  x: number,
  y: number,
  tileId: number,
): boolean {
  if (tileId === EMPTY_TILE) {
    return eraseTile(tilemap, layerId, x, y);
  }
  const layer = getTilemapLayer(tilemap, layerId);
  if (!layer) {
    return false;
  }
  const chunkX = chunkCoord(x);
  const chunkY = chunkCoord(y);
  let chunk = findChunk(layer, chunkX, chunkY);
  if (!chunk) {
    chunk = createEmptyChunk(chunkX, chunkY);
    layer.chunks.push(chunk);
    sortChunks(layer);
  }
  const localX = chunkLocalCoord(x);
  const localY = chunkLocalCoord(y);
  const index = localY * chunk.width + localX;
  if (chunk.tiles[index] === tileId) {
    return false;
  }
  chunk.tiles[index] = tileId;
  return true;
}

export function eraseTile(
  tilemap: TilemapComponentData,
  layerId: string,
  x: number,
  y: number,
): boolean {
  const layer = getTilemapLayer(tilemap, layerId);
  if (!layer) {
    return false;
  }
  const chunkX = chunkCoord(x);
  const chunkY = chunkCoord(y);
  const chunk = findChunk(layer, chunkX, chunkY);
  if (!chunk) {
    return false;
  }
  const localX = chunkLocalCoord(x);
  const localY = chunkLocalCoord(y);
  const index = localY * chunk.width + localX;
  if (chunk.tiles[index] === EMPTY_TILE) {
    return false;
  }
  chunk.tiles[index] = EMPTY_TILE;
  if (isChunkEmpty(chunk)) {
    layer.chunks = layer.chunks.filter(
      (entry) => entry.x !== chunkX || entry.y !== chunkY,
    );
  }
  return true;
}

export function applyTileChanges(
  tilemap: TilemapComponentData,
  changes: readonly TileChange[],
  field: "before" | "after",
): void {
  for (const change of changes) {
    const tileId = change[field];
    if (tileId === EMPTY_TILE) {
      eraseTile(tilemap, change.layerId, change.x, change.y);
    } else {
      setTile(tilemap, change.layerId, change.x, change.y, tileId);
    }
  }
}

export function pruneEmptyTilemapChunks(tilemap: TilemapComponentData): void {
  for (const layer of tilemap.layers) {
    layer.chunks = layer.chunks.filter((chunk) => !isChunkEmpty(chunk));
  }
}

export interface OccupiedTileBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function occupiedTileBounds(
  tilemap: TilemapComponentData,
): OccupiedTileBounds | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let any = false;
  for (const layer of tilemap.layers) {
    if (!layer.visible) {
      continue;
    }
    for (const chunk of layer.chunks) {
      for (let i = 0; i < chunk.tiles.length; i += 1) {
        if (chunk.tiles[i] === EMPTY_TILE) {
          continue;
        }
        any = true;
        const localX = i % chunk.width;
        const localY = Math.floor(i / chunk.width);
        const x = chunk.x * TILEMAP_CHUNK_SIZE + localX;
        const y = chunk.y * TILEMAP_CHUNK_SIZE + localY;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!any) {
    return undefined;
  }
  return { minX, minY, maxX, maxY };
}

export function tilemapLocalBounds(
  tilemap: TilemapComponentData,
  emptyExtentTiles: number,
): { x: number; y: number; width: number; height: number } {
  const occupied = occupiedTileBounds(tilemap);
  if (!occupied) {
    return {
      x: 0,
      y: 0,
      width: emptyExtentTiles * tilemap.tileWidth,
      height: emptyExtentTiles * tilemap.tileHeight,
    };
  }
  return {
    x: occupied.minX * tilemap.tileWidth,
    y: occupied.minY * tilemap.tileHeight,
    width: (occupied.maxX - occupied.minX + 1) * tilemap.tileWidth,
    height: (occupied.maxY - occupied.minY + 1) * tilemap.tileHeight,
  };
}

export function createDefaultTilemapLayer(
  partial?: Partial<Omit<TilemapLayerData, "id">> & { id?: string },
): TilemapLayerData {
  return {
    id: partial?.id ?? createId("layer"),
    name: partial?.name ?? DEFAULT_TILEMAP_LAYER_NAME,
    visible: partial?.visible ?? true,
    opacity: partial?.opacity ?? 1,
    chunks: partial?.chunks ? partial.chunks.map(cloneChunk) : [],
  };
}

function findChunk(
  layer: TilemapLayerData,
  chunkX: number,
  chunkY: number,
): TileChunkData | undefined {
  return layer.chunks.find(
    (chunk) => chunk.x === chunkX && chunk.y === chunkY,
  );
}

function createEmptyChunk(chunkX: number, chunkY: number): TileChunkData {
  const cells = TILEMAP_CHUNK_SIZE * TILEMAP_CHUNK_SIZE;
  return {
    x: chunkX,
    y: chunkY,
    width: TILEMAP_CHUNK_SIZE,
    height: TILEMAP_CHUNK_SIZE,
    tiles: Array.from({ length: cells }, () => EMPTY_TILE),
  };
}

function tileAt(chunk: TileChunkData, localX: number, localY: number): number {
  const index = localY * chunk.width + localX;
  if (index < 0 || index >= chunkCellCount(chunk)) {
    return EMPTY_TILE;
  }
  return chunk.tiles[index] ?? EMPTY_TILE;
}

function cloneChunk(chunk: TileChunkData): TileChunkData {
  return {
    x: chunk.x,
    y: chunk.y,
    width: chunk.width,
    height: chunk.height,
    tiles: [...chunk.tiles],
  };
}

function sortChunks(layer: TilemapLayerData): void {
  layer.chunks.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
}

export { chunkKey };
