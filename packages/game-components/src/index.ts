export type {
  ComponentPropertyKind,
  ComponentPropertyNumber,
  ComponentPropertyString,
  ComponentPropertyBoolean,
  ComponentPropertyEnum,
  ComponentPropertyDynamicEnum,
  DynamicEnumSource,
  ComponentPropertyDefinition,
  ScriptInstance,
  ScriptCreateContext,
  ScriptRuntimeServices,
  ScriptTransform2D,
  ScriptTransform2DPatch,
  ComponentDefinition,
  ComponentCategoryGroup,
  DefineComponentInput,
  BusEventDefinition,
} from "./types.js";
export {
  defineComponent,
  defaultPropertiesFromDefinition,
} from "./define-component.js";
export {
  ComponentRegistry,
  defaultComponentRegistry,
} from "./registry.js";
export {
  healthComponent,
  registerSharedComponents,
} from "./shared/health.js";
export { changeSceneComponent } from "./shared/change-scene.js";
export { installSceneFlowRuntime } from "./shared/scene-flow-runtime.js";
export type {
  ComponentCatalogEntry,
  ComponentCatalogData,
} from "./catalog.js";
export {
  toComponentCatalogEntry,
  buildComponentCatalog,
  applyComponentCatalog,
  parseComponentCatalogData,
} from "./catalog.js";
