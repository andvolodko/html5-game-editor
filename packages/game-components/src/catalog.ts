import {
  COMPONENT_ASSET_TYPES,
  type BusEventDefinition,
  type ComponentAssetType,
  type ComponentDefinition,
  type ComponentPropertyDefinition,
} from "./types.js";
import type { ComponentRegistry } from "./registry.js";
import { defineComponent } from "./define-component.js";
import { ComponentRegistry as Registry } from "./registry.js";

/**
 * Serializable inspector catalog (no `create` factories).
 * Served by project-server from the active game's components barrel.
 */
export interface ComponentCatalogEntry {
  id: string;
  displayName: string;
  category: string;
  categoryOrder: number;
  order: number;
  allowMultiple?: boolean;
  properties: Readonly<Record<string, ComponentPropertyDefinition>>;
}

export interface ComponentCatalogData {
  components: ComponentCatalogEntry[];
  busEvents: BusEventDefinition[];
}

export function toComponentCatalogEntry(
  definition: ComponentDefinition,
): ComponentCatalogEntry {
  const entry: ComponentCatalogEntry = {
    id: definition.id,
    displayName: definition.displayName,
    category: definition.category,
    categoryOrder: definition.categoryOrder,
    order: definition.order,
    properties: structuredClone(definition.properties),
  };
  if (definition.allowMultiple !== undefined) {
    entry.allowMultiple = definition.allowMultiple;
  }
  return entry;
}

/** Build a JSON-safe catalog from an explicit register function + bus events. */
export function buildComponentCatalog(
  register: (registry: ComponentRegistry) => void,
  busEvents: readonly BusEventDefinition[] = [],
): ComponentCatalogData {
  const registry = new Registry();
  register(registry);
  return {
    components: registry.list().map(toComponentCatalogEntry),
    busEvents: busEvents.map((event) => ({ ...event })),
  };
}

/** Apply a server-fetched catalog into an editor session registry (metadata only). */
export function applyComponentCatalog(
  registry: ComponentRegistry,
  catalog: ComponentCatalogData,
): void {
  for (const entry of catalog.components) {
    const definition = defineComponent({
      id: entry.id,
      displayName: entry.displayName,
      category: entry.category,
      categoryOrder: entry.categoryOrder,
      order: entry.order,
      properties: structuredClone(entry.properties),
      ...(entry.allowMultiple !== undefined
        ? { allowMultiple: entry.allowMultiple }
        : {}),
    });
    registry.register(definition);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComponentAssetType(value: unknown): value is ComponentAssetType {
  for (const kind of COMPONENT_ASSET_TYPES) {
    if (value === kind) {
      return true;
    }
  }
  return false;
}

function isPropertyDefinition(
  value: unknown,
): value is ComponentPropertyDefinition {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  switch (value.kind) {
    case "number":
      return typeof value.default === "number";
    case "string":
      return typeof value.default === "string";
    case "boolean":
      return typeof value.default === "boolean";
    case "enum":
      return (
        typeof value.default === "string" &&
        Array.isArray(value.options) &&
        value.options.every((option) => typeof option === "string")
      );
    case "dynamicEnum":
      return (
        typeof value.default === "string" &&
        (value.source === "scenes" ||
          value.source === "busEvents" ||
          value.source === "gltfAnimations")
      );
    case "asset":
      return (
        typeof value.default === "string" &&
        isComponentAssetType(value.assetType)
      );
    default:
      return false;
  }
}

/** Validate unknown JSON from project-server into a catalog. */
export function parseComponentCatalogData(input: unknown): ComponentCatalogData {
  if (!isRecord(input)) {
    throw new Error("Component catalog must be an object");
  }
  if (!Array.isArray(input.components)) {
    throw new Error("Component catalog.components must be an array");
  }
  if (!Array.isArray(input.busEvents)) {
    throw new Error("Component catalog.busEvents must be an array");
  }

  const components: ComponentCatalogEntry[] = input.components.map(
    (raw, index) => {
      if (!isRecord(raw)) {
        throw new Error(`Component catalog.components[${String(index)}] invalid`);
      }
      if (
        typeof raw.id !== "string" ||
        raw.id.length === 0 ||
        typeof raw.displayName !== "string" ||
        typeof raw.category !== "string" ||
        typeof raw.categoryOrder !== "number" ||
        typeof raw.order !== "number" ||
        !isRecord(raw.properties)
      ) {
        throw new Error(
          `Component catalog.components[${String(index)}] missing fields`,
        );
      }
      const properties: Record<string, ComponentPropertyDefinition> = {};
      for (const [key, prop] of Object.entries(raw.properties)) {
        if (!isPropertyDefinition(prop)) {
          throw new Error(
            `Component catalog.components[${String(index)}].properties.${key} invalid`,
          );
        }
        properties[key] = prop;
      }
      const entry: ComponentCatalogEntry = {
        id: raw.id,
        displayName: raw.displayName,
        category: raw.category,
        categoryOrder: raw.categoryOrder,
        order: raw.order,
        properties,
      };
      if (raw.allowMultiple !== undefined) {
        if (typeof raw.allowMultiple !== "boolean") {
          throw new Error(
            `Component catalog.components[${String(index)}].allowMultiple invalid`,
          );
        }
        entry.allowMultiple = raw.allowMultiple;
      }
      return entry;
    },
  );

  const busEvents: BusEventDefinition[] = input.busEvents.map((raw, index) => {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      raw.id.length === 0 ||
      typeof raw.label !== "string"
    ) {
      throw new Error(`Component catalog.busEvents[${String(index)}] invalid`);
    }
    return { id: raw.id, label: raw.label };
  });

  return { components, busEvents };
}
