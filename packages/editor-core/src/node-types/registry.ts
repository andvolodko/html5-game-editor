import type {
  NodeTypeCategoryGroup,
  NodeTypeDefinition,
  NodeTypeId,
} from "./types.js";

/**
 * Central declarative registry for creatable scene node types.
 * Menus, CreateNodeCommand, and asset-compatibility checks share this source.
 */
export class NodeTypeRegistry {
  private readonly byId = new Map<NodeTypeId, NodeTypeDefinition>();

  register(definition: NodeTypeDefinition): void {
    if (this.byId.has(definition.id)) {
      throw new Error(
        `NodeTypeRegistry: duplicate registration for "${definition.id}"`,
      );
    }
    this.byId.set(definition.id, definition);
  }

  get(id: NodeTypeId): NodeTypeDefinition | undefined {
    return this.byId.get(id);
  }

  require(id: NodeTypeId): NodeTypeDefinition {
    const def = this.byId.get(id);
    if (!def) {
      throw new Error(`NodeTypeRegistry: unknown node type "${id}"`);
    }
    return def;
  }

  has(id: NodeTypeId): boolean {
    return this.byId.has(id);
  }

  list(): NodeTypeDefinition[] {
    return [...this.byId.values()].sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.label.localeCompare(b.label);
    });
  }

  /** Creatable types grouped for menus. */
  listMenuGroups(): NodeTypeCategoryGroup[] {
    const groups = new Map<string, NodeTypeCategoryGroup>();
    for (const def of this.list()) {
      if (def.creatable === false) {
        continue;
      }
      let group = groups.get(def.category);
      if (!group) {
        group = {
          category: def.category,
          categoryOrder: def.categoryOrder,
          types: [],
        };
        groups.set(def.category, group);
      }
      group.types.push(def);
    }
    return [...groups.values()].sort(
      (a, b) => a.categoryOrder - b.categoryOrder,
    );
  }

  clear(): void {
    this.byId.clear();
  }
}

export const defaultNodeTypeRegistry = new NodeTypeRegistry();
