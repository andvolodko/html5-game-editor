import {
  createNodeWithVisual,
  createTilemapComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiTilemapTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.tilemap",
      label: "Tilemap",
      category: "Tilemap",
      categoryOrder: 26,
      order: 10,
      icon: "⊞",
      canHaveChildren: false,
      supportedAssetTypes: ["tileset"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createTilemapComponent({
            ...(ctx.assetId !== undefined ? { tileSetId: ctx.assetId } : {}),
            ...(ctx.tileWidth !== undefined ? { tileWidth: ctx.tileWidth } : {}),
            ...(ctx.tileHeight !== undefined
              ? { tileHeight: ctx.tileHeight }
              : {}),
          }),
          ctx.parentId,
        ),
    }),
  );
}
