import type {
  ScriptParticlesApi,
  ScriptRuntimeServices,
} from "./types.js";

class HostScriptParticlesApi implements ScriptParticlesApi {
  constructor(
    private readonly nodeId: string,
    private readonly services: ScriptRuntimeServices,
  ) {}

  play(): void {
    this.services.controlParticleEmitter?.(this.nodeId, "play");
  }

  pause(): void {
    this.services.controlParticleEmitter?.(this.nodeId, "pause");
  }

  stop(): void {
    this.services.controlParticleEmitter?.(this.nodeId, "stop");
  }

  restart(): void {
    this.services.controlParticleEmitter?.(this.nodeId, "restart");
  }
}

export function createScriptParticlesApi(
  nodeId: string,
  services: ScriptRuntimeServices,
): ScriptParticlesApi {
  return new HostScriptParticlesApi(nodeId, services);
}
