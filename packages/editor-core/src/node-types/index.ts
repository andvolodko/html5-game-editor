import { registerPixiNodeTypes } from "./pixi-definitions.js";
import { defaultNodeTypeRegistry } from "./registry.js";
import type { NodeTypeRegistry } from "./registry.js";

let pixiRegistered = false;

/** Ensures built-in Pixi node types are registered exactly once on the default registry. */
export function ensureDefaultNodeTypesRegistered(): NodeTypeRegistry {
  if (!pixiRegistered) {
    registerPixiNodeTypes(defaultNodeTypeRegistry);
    pixiRegistered = true;
  }
  return defaultNodeTypeRegistry;
}

export { NodeTypeRegistry, defaultNodeTypeRegistry } from "./registry.js";
export { registerPixiNodeTypes } from "./pixi-definitions.js";
export { resolveCreateParentId } from "./resolve-create-parent.js";
export type {
  NodeTypeId,
  NodeCreationContext,
  NodeTypeDefinition,
  NodeTypeCategoryGroup,
} from "./types.js";
