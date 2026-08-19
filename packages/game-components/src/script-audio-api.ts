import type { PlayAudioOptions, ScriptAudioApi, ScriptRuntimeServices } from "./types.js";

class HostScriptAudioApi implements ScriptAudioApi {
  constructor(private readonly services: ScriptRuntimeServices) {}

  play(assetId: string, options?: PlayAudioOptions): void {
    if (options === undefined) {
      this.services.playAudio?.(assetId);
      return;
    }
    this.services.playAudio?.(assetId, options);
  }

  stop(assetId?: string): void {
    this.services.stopAudio?.(assetId);
  }

  setVolume(assetId: string, volume: number): void {
    this.services.setAudioVolume?.(assetId, volume);
  }
}

export function createScriptAudioApi(
  services: ScriptRuntimeServices,
): ScriptAudioApi {
  return new HostScriptAudioApi(services);
}
