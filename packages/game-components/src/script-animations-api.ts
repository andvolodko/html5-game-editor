import type {
  ScriptAnimationsApi,
  ScriptPlayAnimationOptions,
  ScriptRuntimeServices,
} from "./types.js";

/** Used when the host has not loaded the clip duration yet. */
const FALLBACK_CLIP_DURATION_SECONDS = 2;

function timeScalePatch(
  services: ScriptRuntimeServices,
  nodeId: string,
): { timeScale?: number } {
  const timeScale = services.getModel3DPlayback?.(nodeId)?.timeScale;
  return timeScale !== undefined ? { timeScale } : {};
}

class HostScriptAnimationsApi implements ScriptAnimationsApi {
  constructor(
    private readonly nodeId: string,
    private readonly services: ScriptRuntimeServices,
  ) {}

  list(): readonly string[] {
    return this.services.listModel3DAnimations?.(this.nodeId) ?? [];
  }

  play(clip: string, options?: ScriptPlayAnimationOptions): void {
    this.services.setModel3DPlayback?.(this.nodeId, {
      animation: clip,
      loop: options?.loop ?? true,
      playing: true,
      ...timeScalePatch(this.services, this.nodeId),
    });
  }

  stop(): void {
    this.services.setModel3DPlayback?.(this.nodeId, {
      playing: false,
      ...timeScalePatch(this.services, this.nodeId),
    });
  }

  freeze(): void {
    this.services.setModel3DPlayback?.(this.nodeId, {
      loop: false,
      playing: false,
      ...timeScalePatch(this.services, this.nodeId),
    });
  }

  duration(clip?: string): number {
    const authored = this.services.getModel3DAnimationDuration?.(
      this.nodeId,
      clip,
    );
    const timeScale =
      this.services.getModel3DPlayback?.(this.nodeId)?.timeScale ?? 1;
    const raw =
      authored !== undefined && authored > 0
        ? authored
        : FALLBACK_CLIP_DURATION_SECONDS;
    return timeScale > 0 ? raw / timeScale : raw;
  }
}

export function createScriptAnimationsApi(
  nodeId: string,
  services: ScriptRuntimeServices,
): ScriptAnimationsApi {
  return new HostScriptAnimationsApi(nodeId, services);
}
