import type {
  ScriptNodeHandle,
  ScriptRuntimeServices,
  ScriptSceneApi,
  ScriptSpawnModel3DOptions,
} from "./types.js";
import type { ScriptNodeHandleCache } from "./script-node-api.js";

class HostScriptSceneApi implements ScriptSceneApi {
  constructor(
    private readonly services: ScriptRuntimeServices,
    private readonly cache: ScriptNodeHandleCache,
    private readonly findByNameId: (name: string) => string | undefined,
  ) {}

  getNode(nodeId: string): ScriptNodeHandle | undefined {
    return this.cache.tryGet(nodeId);
  }

  findByName(name: string): ScriptNodeHandle | undefined {
    const nodeId = this.findByNameId(name);
    if (nodeId === undefined) {
      return undefined;
    }
    return this.cache.tryGet(nodeId);
  }

  spawn(options: ScriptSpawnModel3DOptions): string | undefined {
    return this.services.spawnModel3D?.(options);
  }
}

export function createScriptSceneApi(
  services: ScriptRuntimeServices,
  cache: ScriptNodeHandleCache,
  findByNameId: (name: string) => string | undefined,
): ScriptSceneApi {
  return new HostScriptSceneApi(services, cache, findByNameId);
}
