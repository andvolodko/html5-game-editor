import {
  createNodeWithVisual,
  createSpineComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiSpineTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.spine",
      label: "Spine",
      category: "Spine",
      categoryOrder: 25,
      order: 10,
      icon: "◇",
      canHaveChildren: false,
      supportedAssetTypes: ["spine"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createSpineComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );
}
