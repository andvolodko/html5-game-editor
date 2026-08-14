import {
  createBitmapTextComponent,
  createHTMLTextComponent,
  createNodeWithVisual,
  createTextComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiTextTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.text",
      label: "Text",
      category: "Text",
      categoryOrder: 30,
      order: 10,
      icon: "T",
      canHaveChildren: false,
      supportedAssetTypes: ["webfont"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createTextComponent(
            ctx.assetId !== undefined
              ? {
                  style: {
                    fontAssetId: ctx.assetId,
                    ...(ctx.fontFamily !== undefined
                      ? { fontFamily: ctx.fontFamily }
                      : {}),
                  },
                  anchor: { x: 0, y: 0 },
                }
              : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.bitmap-text",
      label: "Bitmap Text",
      category: "Text",
      categoryOrder: 30,
      order: 20,
      icon: "B",
      canHaveChildren: false,
      supportedAssetTypes: ["font"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createBitmapTextComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.html-text",
      label: "HTML Text",
      category: "Text",
      categoryOrder: 30,
      order: 30,
      icon: "H",
      canHaveChildren: false,
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createHTMLTextComponent(),
          ctx.parentId,
        ),
    }),
  );
}
