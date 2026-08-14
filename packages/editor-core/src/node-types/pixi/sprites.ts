import {
  createAnimatedSpriteComponent,
  createNineSliceSpriteComponent,
  createNodeWithVisual,
  createSpriteComponent,
  createTilingSpriteComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiSpriteTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.sprite",
      label: "Sprite",
      category: "Sprites",
      categoryOrder: 20,
      order: 10,
      icon: "▧",
      canHaveChildren: false,
      supportedAssetTypes: ["texture", "aseprite"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createSpriteComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.nine-slice-sprite",
      label: "Nine Slice Sprite",
      category: "Sprites",
      categoryOrder: 20,
      order: 20,
      icon: "▦",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createNineSliceSpriteComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.tiling-sprite",
      label: "Tiling Sprite",
      category: "Sprites",
      categoryOrder: 20,
      order: 30,
      icon: "▩",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createTilingSpriteComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.animated-sprite",
      label: "Animated Sprite",
      category: "Sprites",
      categoryOrder: 20,
      order: 40,
      icon: "▷",
      canHaveChildren: false,
      supportedAssetTypes: ["texture", "aseprite"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createAnimatedSpriteComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId, frames: [] } : {},
          ),
          ctx.parentId,
        ),
    }),
  );
}
