import type {
  ComponentDefinition,
  ComponentPropertyDefinition,
  DefineComponentInput,
} from "./types.js";

/** Identity helper so callers get typed definitions without ceremony. */
export function defineComponent(
  definition: DefineComponentInput,
): ComponentDefinition {
  return definition;
}

/** Build default property bag from a definition (deep-cloned primitives). */
export function defaultPropertiesFromDefinition(
  definition: ComponentDefinition,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(definition.properties)) {
    properties[key] = defaultValueForProperty(field);
  }
  return properties;
}

function defaultValueForProperty(field: ComponentPropertyDefinition): unknown {
  switch (field.kind) {
    case "number":
      return field.default;
    case "string":
      return field.default;
    case "boolean":
      return field.default;
    case "enum":
      return field.default;
    case "dynamicEnum":
      return field.default;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}
