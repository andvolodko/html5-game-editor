import {
  createGraphicsComponent,
  createNodeWithVisual,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiGraphicsTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.graphics",
      label: "Graphics",
      category: "Graphics",
      categoryOrder: 40,
      order: 10,
      icon: "◯",
      canHaveChildren: false,
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createGraphicsComponent(),
          ctx.parentId,
        ),
    }),
  );
}
