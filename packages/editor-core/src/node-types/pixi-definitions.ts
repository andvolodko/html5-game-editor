import type { NodeTypeRegistry } from "./registry.js";
import { registerPixiContainerTypes } from "./pixi/container.js";
import { registerPixiGraphicsTypes } from "./pixi/graphics.js";
import { registerPixiMeshTypes } from "./pixi/mesh.js";
import { registerPixiSpriteTypes } from "./pixi/sprites.js";
import { registerPixiSpineTypes } from "./pixi/spine.js";
import { registerPixiTextTypes } from "./pixi/text.js";

/** Registers built-in PixiJS node types into the given registry. */
export function registerPixiNodeTypes(registry: NodeTypeRegistry): void {
  registerPixiContainerTypes(registry);
  registerPixiSpriteTypes(registry);
  registerPixiSpineTypes(registry);
  registerPixiTextTypes(registry);
  registerPixiGraphicsTypes(registry);
  registerPixiMeshTypes(registry);

  // ParticleContainer is available in pixi.js@8.19 but only accepts Particle
  // children (not Container hierarchy). Deferred to keep scene parenting stable.
}
