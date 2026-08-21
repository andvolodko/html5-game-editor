import type { ParticleEmitterComponentData } from "@game-editor/scene";
import type { Editor } from "./editor.js";

export type ParticleEmitterControlAction =
  | "play"
  | "pause"
  | "stop"
  | "restart";

/**
 * Transient ParticleEmitter playback — does not dirty the document or write
 * scene JSON. Mirrors SceneRenderer.controlParticleEmitter.
 */
export function editorControlParticleEmitter(
  editor: Editor,
  nodeId: string,
  action: ParticleEmitterControlAction,
): void {
  editor.viewport.getRenderer()?.controlParticleEmitter?.(nodeId, action);
}

/** Live particle counts for Inspector stats (selected emitter only). */
export function editorGetParticleEmitterStats(
  editor: Editor,
  nodeId: string,
): { alive: number; maxParticles: number; rate: number } | undefined {
  return editor.viewport.getRenderer()?.getParticleEmitterStats?.(nodeId);
}

/** Live config preview while dragging curves — does not dirty the document. */
export function editorPreviewParticleEmitterConfig(
  editor: Editor,
  nodeId: string,
  config: ParticleEmitterComponentData,
): void {
  editor.viewport
    .getRenderer()
    ?.previewParticleEmitterConfig?.(nodeId, config);
}
