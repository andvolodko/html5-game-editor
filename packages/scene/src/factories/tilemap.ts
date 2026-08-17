import { createId } from "@game-editor/shared";
import { DEFAULT_TILE_SIZE } from "../defaults.js";
import {
  createDefaultTilemapLayer,
} from "../tilemap.js";
import type { TilemapComponentData } from "../tilemap-data.js";

export function createTilemapComponent(
  partial?: Partial<Omit<TilemapComponentData, "type" | "id">> & { id?: string },
): TilemapComponentData {
  const data: TilemapComponentData = {
    type: "Tilemap",
    id: partial?.id ?? createId("comp"),
    tileWidth: partial?.tileWidth ?? DEFAULT_TILE_SIZE,
    tileHeight: partial?.tileHeight ?? DEFAULT_TILE_SIZE,
    layers:
      partial?.layers && partial.layers.length > 0
        ? partial.layers.map((layer) =>
            createDefaultTilemapLayer({
              id: layer.id,
              name: layer.name,
              visible: layer.visible,
              opacity: layer.opacity,
              chunks: layer.chunks,
            }),
          )
        : [createDefaultTilemapLayer()],
  };
  if (partial?.tileSetId !== undefined) {
    data.tileSetId = partial.tileSetId;
  }
  return data;
}
