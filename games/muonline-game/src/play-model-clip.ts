import type { ScriptRuntimeServices } from "@game-editor/game-components";

const FALLBACK_CLIP_DURATION_SECONDS = 2;

export function playModelClip(
  services: ScriptRuntimeServices,
  nodeId: string,
  animation: string,
  loop: boolean,
): void {
  const timeScale = services.getModel3DPlayback?.(nodeId)?.timeScale;
  services.setModel3DPlayback?.(nodeId, {
    animation,
    loop,
    playing: true,
    ...(timeScale !== undefined ? { timeScale } : {}),
  });
}

export function freezeModelClip(
  services: ScriptRuntimeServices,
  nodeId: string,
): void {
  const timeScale = services.getModel3DPlayback?.(nodeId)?.timeScale;
  services.setModel3DPlayback?.(nodeId, {
    loop: false,
    playing: false,
    ...(timeScale !== undefined ? { timeScale } : {}),
  });
}

export function clipWallDurationSeconds(
  services: ScriptRuntimeServices,
  nodeId: string,
  animation: string | undefined,
): number {
  const authored = services.getModel3DAnimationDuration?.(nodeId, animation);
  const timeScale = services.getModel3DPlayback?.(nodeId)?.timeScale ?? 1;
  const raw =
    authored !== undefined && authored > 0
      ? authored
      : FALLBACK_CLIP_DURATION_SECONDS;
  return timeScale > 0 ? raw / timeScale : raw;
}
