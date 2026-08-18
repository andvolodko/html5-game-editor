import { createMaskNode } from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import type { NodeCreationContext } from "../types.js";
import { def, withParent } from "./helpers.js";

export function registerPixiMaskType(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.mask",
      label: "Mask",
      category: "Container",
      categoryOrder: 10,
      order: 30,
      icon: "◐",
      canHaveChildren: true,
      createDefaultNode: (ctx: NodeCreationContext) =>
        withParent(
          createMaskNode(ctx.name, ctx.position, ctx.parentId),
          ctx.parentId,
        ),
    }),
  );
}
