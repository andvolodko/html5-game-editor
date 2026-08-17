/**
 * Serializable Tilemap component data. Cells are not scene nodes.
 */

/** Sentinel for an empty cell. Persisted in chunk arrays. */
export const EMPTY_TILE = -1;

/** Sparse chunk extent in tile cells (not pixels). */
export const TILEMAP_CHUNK_SIZE = 32;

export const DEFAULT_TILEMAP_LAYER_NAME = "Layer 1";

export interface TileChunkData {
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: number[];
}

export interface TilemapLayerData {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  chunks: TileChunkData[];
}

export interface TilemapComponentData {
  type: "Tilemap";
  id: string;
  /** Catalogue TileSet asset id. */
  tileSetId?: string;
  /** World-space size of one cell. Defaults from the TileSet when assigned. */
  tileWidth: number;
  tileHeight: number;
  layers: TilemapLayerData[];
}

export interface TileChange {
  layerId: string;
  x: number;
  y: number;
  before: number;
  after: number;
}

export function chunkCoord(tile: number, chunkSize: number = TILEMAP_CHUNK_SIZE): number {
  return Math.floor(tile / chunkSize);
}

export function chunkLocalCoord(
  tile: number,
  chunkSize: number = TILEMAP_CHUNK_SIZE,
): number {
  return ((tile % chunkSize) + chunkSize) % chunkSize;
}

export function chunkKey(chunkX: number, chunkY: number): string {
  return `${String(chunkX)},${String(chunkY)}`;
}

export function chunkCellCount(chunk: TileChunkData): number {
  return chunk.width * chunk.height;
}

export function isChunkEmpty(chunk: TileChunkData): boolean {
  for (const tile of chunk.tiles) {
    if (tile !== EMPTY_TILE) {
      return false;
    }
  }
  return true;
}
