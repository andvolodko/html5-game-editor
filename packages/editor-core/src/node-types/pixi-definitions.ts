import type { NodeTypeRegistry } from "./registry.js";
import { registerPixiContainerTypes } from "./pixi/container.js";
import { registerPixiHitZoneType } from "./pixi/hit-zone.js";
import { registerPixiMaskType } from "./pixi/mask.js";
import { registerPixiGraphicsTypes } from "./pixi/graphics.js";
import { registerPixiMeshTypes } from "./pixi/mesh.js";
import { registerPixiSpriteTypes } from "./pixi/sprites.js";
import { registerPixiSpineTypes } from "./pixi/spine.js";
import { registerPixiTextTypes } from "./pixi/text.js";
import { registerPixiTilemapTypes } from "./pixi/tilemap.js";
import { registerPixiParticleEmitterTypes } from "./pixi/particle-emitter.js";

/** Registers built-in PixiJS node types into the given registry. */
export function registerPixiNodeTypes(registry: NodeTypeRegistry): void {
  registerPixiContainerTypes(registry);
  registerPixiHitZoneType(registry);
  registerPixiMaskType(registry);
  registerPixiSpriteTypes(registry);
  registerPixiTilemapTypes(registry);
  registerPixiSpineTypes(registry);
  registerPixiTextTypes(registry);
  registerPixiGraphicsTypes(registry);
  registerPixiMeshTypes(registry);
  registerPixiParticleEmitterTypes(registry);
}
