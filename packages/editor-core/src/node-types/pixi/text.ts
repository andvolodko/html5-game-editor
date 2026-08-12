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
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createTextComponent(),
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
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createBitmapTextComponent(),
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
