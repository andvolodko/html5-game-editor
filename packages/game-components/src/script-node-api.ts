import {
  getComponentByType,
  getNodeVisible,
  type ComponentData,
} from "@game-editor/scene";
import type {
  ScriptNodeHandle,
  ScriptNodeStatesApi,
  ScriptRuntimeServices,
  ScriptSceneLookup,
} from "./types.js";

export class ScriptNodeHandleCache {
  private readonly handles = new Map<string, HostScriptNodeHandle>();
  private readonly listedNames = new Map<string, string>();

  constructor(
    private readonly services: ScriptRuntimeServices,
    private readonly lookup: ScriptSceneLookup | undefined,
  ) {}

  get(nodeId: string, listedName?: string): HostScriptNodeHandle {
    if (listedName !== undefined) {
      this.listedNames.set(nodeId, listedName);
    }
    let handle = this.handles.get(nodeId);
    if (!handle) {
      handle = new HostScriptNodeHandle(nodeId, this.services, this.lookup, this);
      this.handles.set(nodeId, handle);
    }
    return handle;
  }

  tryGet(nodeId: string): HostScriptNodeHandle | undefined {
    if (this.lookup && !this.lookup.getNode(nodeId)) {
      return undefined;
    }
    return this.get(nodeId);
  }

  listedName(nodeId: string): string | undefined {
    return this.listedNames.get(nodeId);
  }
}

class HostScriptNodeHandle implements ScriptNodeHandle {
  readonly states: ScriptNodeStatesApi;

  constructor(
    readonly id: string,
    private readonly services: ScriptRuntimeServices,
    private readonly lookup: ScriptSceneLookup | undefined,
    private readonly cache: ScriptNodeHandleCache,
  ) {
    this.states = {
      get active() {
        return services.getNodeState?.(id) ?? null;
      },
      set: (stateIdOrName: string) => {
        services.setNodeState?.(id, stateIdOrName);
      },
      setBase: () => {
        services.setNodeState?.(id, null);
      },
    };
  }

  get name(): string {
    return (
      this.lookup?.getNode(this.id)?.name ??
      this.cache.listedName(this.id) ??
      ""
    );
  }

  set name(value: string) {
    const node = this.lookup?.getNode(this.id);
    if (node) {
      node.name = value;
    }
  }

  get visible(): boolean {
    const node = this.lookup?.getNode(this.id);
    return node ? getNodeVisible(node) : true;
  }

  set visible(value: boolean) {
    this.services.setNodeVisible?.(this.id, value);
  }

  get parent(): ScriptNodeHandle | undefined {
    const parentId = this.lookup?.getParentId(this.id);
    if (parentId === undefined) {
      return undefined;
    }
    return this.cache.tryGet(parentId);
  }

  get children(): readonly ScriptNodeHandle[] {
    const node = this.lookup?.getNode(this.id);
    if (node) {
      return node.children.map((child) => this.cache.get(child.id));
    }
    return (this.services.listChildNodes?.(this.id) ?? []).map((child) =>
      this.cache.get(child.id, child.name),
    );
  }

  destroy(): void {
    this.services.destroyNode?.(this.id);
  }

  getComponent<T extends ComponentData["type"]>(
    type: T,
  ): Extract<ComponentData, { type: T }> | undefined {
    const node = this.lookup?.getNode(this.id);
    if (!node) {
      return undefined;
    }
    return getComponentByType(node, type);
  }
}

export function createScriptNodeHandleCache(
  services: ScriptRuntimeServices,
  lookup: ScriptSceneLookup | undefined,
): ScriptNodeHandleCache {
  return new ScriptNodeHandleCache(services, lookup);
}
