import type {
  ComponentCategoryGroup,
  ComponentDefinition,
} from "./types.js";

/**
 * Explicit catalog of user/script components.
 * Shared by editor Inspector and runtime host — no filesystem scanning.
 */
export class ComponentRegistry {
  private readonly byId = new Map<string, ComponentDefinition>();

  register(definition: ComponentDefinition): void {
    if (this.byId.has(definition.id)) {
      throw new Error(
        `ComponentRegistry: duplicate registration for "${definition.id}"`,
      );
    }
    this.byId.set(definition.id, definition);
  }

  /**
   * Attach a `create` factory to a metadata-only catalog entry
   * (editor / preview after JSON catalog load). No-op when the id is
   * unknown or `create` is missing. Does not serialize functions.
   */
  attachRuntime(
    componentId: string,
    create: ComponentDefinition["create"],
  ): void {
    if (!create) {
      return;
    }
    const existing = this.byId.get(componentId);
    if (!existing) {
      return;
    }
    existing.create = create;
  }

  get(id: string): ComponentDefinition | undefined {
    return this.byId.get(id);
  }

  require(id: string): ComponentDefinition {
    const def = this.byId.get(id);
    if (!def) {
      throw new Error(`ComponentRegistry: unknown component "${id}"`);
    }
    return def;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  list(): ComponentDefinition[] {
    return [...this.byId.values()].sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /** Creatable types grouped for Add Component menus. */
  listMenuGroups(): ComponentCategoryGroup[] {
    const groups = new Map<string, ComponentCategoryGroup>();
    for (const def of this.list()) {
      let group = groups.get(def.category);
      if (!group) {
        group = {
          category: def.category,
          categoryOrder: def.categoryOrder,
          definitions: [],
        };
        groups.set(def.category, group);
      }
      group.definitions.push(def);
    }
    return [...groups.values()].sort(
      (a, b) => a.categoryOrder - b.categoryOrder,
    );
  }

  clear(): void {
    this.byId.clear();
  }
}

export const defaultComponentRegistry = new ComponentRegistry();
