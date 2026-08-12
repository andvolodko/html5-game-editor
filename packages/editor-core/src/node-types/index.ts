import { registerPixiNodeTypes } from "./pixi-definitions.js";
import { registerThreeNodeTypes } from "./three-definitions.js";
import { defaultNodeTypeRegistry } from "./registry.js";
import type { NodeTypeRegistry } from "./registry.js";

let defaultsRegistered = false;

/** Ensures built-in Pixi + Three node types are registered exactly once on the default registry. */
export function ensureDefaultNodeTypesRegistered(): NodeTypeRegistry {
  if (!defaultsRegistered) {
    registerPixiNodeTypes(defaultNodeTypeRegistry);
    registerThreeNodeTypes(defaultNodeTypeRegistry);
    defaultsRegistered = true;
  }
  return defaultNodeTypeRegistry;
}

export { NodeTypeRegistry, defaultNodeTypeRegistry } from "./registry.js";
export { registerPixiNodeTypes } from "./pixi-definitions.js";
export { registerThreeNodeTypes } from "./three-definitions.js";
export { resolveCreateParentId } from "./resolve-create-parent.js";
export {
  NODE_TYPE_RENDERER_LABELS,
} from "./types.js";
export type {
  NodeTypeId,
  NodeCreationContext,
  NodeTypeDefinition,
  NodeTypeCategoryGroup,
  NodeTypeRendererGroup,
} from "./types.js";
