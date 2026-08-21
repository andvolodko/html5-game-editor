import {
  createNodeWithVisual,
  createParticleEmitterComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiParticleEmitterTypes(
  registry: NodeTypeRegistry,
): void {
  registry.register(
    def({
      id: "pixi.particle-emitter",
      label: "Particle Emitter",
      category: "Effects",
      categoryOrder: 45,
      order: 10,
      icon: "✦",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createParticleEmitterComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );
}
