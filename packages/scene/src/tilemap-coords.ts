import type { SceneData, Vec2 } from "./types.js";
import { applyAff2Point, getWorldAff2, invertAff2 } from "./transform-math.js";
import type { TilemapComponentData } from "./tilemap-data.js";

export function worldToTile(
  scene: SceneData,
  nodeId: string,
  tilemap: TilemapComponentData,
  world: Vec2,
): Vec2 {
  const local = applyAff2Point(invertAff2(getWorldAff2(scene, nodeId)), world);
  return localToTile(tilemap, local);
}

export function tileToWorld(
  scene: SceneData,
  nodeId: string,
  tilemap: TilemapComponentData,
  tile: Vec2,
): Vec2 {
  return applyAff2Point(getWorldAff2(scene, nodeId), tileToLocal(tilemap, tile));
}

export function localToTile(tilemap: TilemapComponentData, local: Vec2): Vec2 {
  const width = tilemap.tileWidth === 0 ? 1 : tilemap.tileWidth;
  const height = tilemap.tileHeight === 0 ? 1 : tilemap.tileHeight;
  return {
    x: Math.floor(local.x / width),
    y: Math.floor(local.y / height),
  };
}

export function tileToLocal(tilemap: TilemapComponentData, tile: Vec2): Vec2 {
  return {
    x: tile.x * tilemap.tileWidth,
    y: tile.y * tilemap.tileHeight,
  };
}

export function tileToLocalCenter(
  tilemap: TilemapComponentData,
  tile: Vec2,
): Vec2 {
  return {
    x: (tile.x + 0.5) * tilemap.tileWidth,
    y: (tile.y + 0.5) * tilemap.tileHeight,
  };
}

/**
 * Map a viewport world-space pointer (already converted via the camera)
 * onto a tile cell. Do not pass raw DOM coordinates.
 */
export function screenToTile(
  scene: SceneData,
  nodeId: string,
  tilemap: TilemapComponentData,
  world: Vec2,
): Vec2 {
  return worldToTile(scene, nodeId, tilemap, world);
}
