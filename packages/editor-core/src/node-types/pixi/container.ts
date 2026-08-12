import { createContainerNode } from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import type { NodeCreationContext } from "../types.js";
import { def, withParent } from "./helpers.js";

export function registerPixiContainerTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.container",
      label: "Container",
      category: "Container",
      categoryOrder: 10,
      order: 10,
      icon: "▣",
      canHaveChildren: true,
      createDefaultNode: (ctx: NodeCreationContext) =>
        withParent(createContainerNode(ctx.name, ctx.parentId), ctx.parentId),
    }),
  );
}
