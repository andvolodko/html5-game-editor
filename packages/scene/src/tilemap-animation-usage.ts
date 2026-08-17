/**
 * Animated-tile usage: which chunks contain which logical animated IDs.
 * Transient — never serialized on the Tilemap component.
 */

import {
  chunkKey,
  EMPTY_TILE,
  type TilemapComponentData,
} from "./tilemap-data.js";

export function tilemapChunkRenderKey(
  layerId: string,
  chunkX: number,
  chunkY: number,
): string {
  return `${layerId}:${chunkKey(chunkX, chunkY)}`;
}

/** logicalTileId → render chunk keys (`layerId:x,y`). */
export function collectAnimatedTileUsage(
  tilemap: TilemapComponentData,
  animatedLogicalIds: ReadonlySet<number>,
): Map<number, Set<string>> {
  const usage = new Map<number, Set<string>>();
  if (animatedLogicalIds.size === 0) {
    return usage;
  }
  for (const layer of tilemap.layers) {
    for (const chunk of layer.chunks) {
      const key = tilemapChunkRenderKey(layer.id, chunk.x, chunk.y);
      for (const tileId of chunk.tiles) {
        if (tileId === EMPTY_TILE || !animatedLogicalIds.has(tileId)) {
          continue;
        }
        let chunks = usage.get(tileId);
        if (!chunks) {
          chunks = new Set();
          usage.set(tileId, chunks);
        }
        chunks.add(key);
      }
    }
  }
  return usage;
}

export function chunksForChangedLogicalTiles(
  usage: ReadonlyMap<number, ReadonlySet<string>>,
  changedLogicalIds: ReadonlySet<number>,
): Set<string> {
  const dirty = new Set<string>();
  for (const logicalId of changedLogicalIds) {
    const chunks = usage.get(logicalId);
    if (!chunks) {
      continue;
    }
    for (const key of chunks) {
      dirty.add(key);
    }
  }
  return dirty;
}
