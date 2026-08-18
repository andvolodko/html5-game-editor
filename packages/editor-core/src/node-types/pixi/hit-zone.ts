import { createHitZoneNode } from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import type { NodeCreationContext } from "../types.js";
import { def, withParent } from "./helpers.js";

export function registerPixiHitZoneType(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.hit-zone",
      label: "Hit Zone",
      category: "Container",
      categoryOrder: 10,
      order: 20,
      icon: "▭",
      canHaveChildren: true,
      createDefaultNode: (ctx: NodeCreationContext) =>
        withParent(
          createHitZoneNode(ctx.name, ctx.position, ctx.parentId),
          ctx.parentId,
        ),
    }),
  );
}
