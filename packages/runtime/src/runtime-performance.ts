import type {
  ScriptPerformanceStats,
  ScriptRendererDrawStats,
} from "@game-editor/game-components";
import {
  addSceneRenderStats,
  EMPTY_SCENE_RENDER_STATS,
  type SceneRenderStats,
} from "@game-editor/scene";
import type { RuntimeRendererRegistration } from "./runtime-renderer-host.js";

const MS_PER_SECOND = 1000;

export interface RuntimeRendererStatsSample {
  merged: SceneRenderStats;
  pixi?: SceneRenderStats;
  three?: SceneRenderStats;
}

export function sampleRendererStats(
  registrations: Iterable<RuntimeRendererRegistration>,
): RuntimeRendererStatsSample {
  let merged = EMPTY_SCENE_RENDER_STATS;
  let pixi: SceneRenderStats | undefined;
  let three: SceneRenderStats | undefined;
  for (const registration of registrations) {
    const sample = registration.renderer.getRenderStats?.();
    if (!sample) {
      continue;
    }
    merged = addSceneRenderStats(merged, sample);
    if (registration.kind === "pixi") {
      pixi = pixi ? addSceneRenderStats(pixi, sample) : sample;
    } else if (registration.kind === "three") {
      three = three ? addSceneRenderStats(three, sample) : sample;
    }
  }
  return { merged, pixi, three };
}

export function buildPerformanceStats(input: {
  frameDt: number;
  gameLogicMs: number;
  renderPassMs: number;
  renderStats: RuntimeRendererStatsSample;
}): ScriptPerformanceStats {
  const frameTimeMs = input.frameDt * MS_PER_SECOND;
  const fps = frameTimeMs > 0 ? MS_PER_SECOND / frameTimeMs : 0;
  const rendererMs =
    input.renderPassMs > 0
      ? input.renderPassMs
      : Math.max(0, frameTimeMs - input.gameLogicMs);
  const pixi = toDrawStats(input.renderStats.pixi);
  const three = toDrawStats(input.renderStats.three);
  return {
    frameTimeMs,
    fps,
    drawCalls: input.renderStats.merged.drawCalls,
    triangles: input.renderStats.merged.triangles,
    gameLogicMs: input.gameLogicMs,
    rendererMs,
    canvas: input.renderStats.merged.canvas,
    displayObjects: input.renderStats.merged.displayObjects,
    ...(pixi !== undefined ? { pixi } : {}),
    ...(three !== undefined ? { three } : {}),
  };
}

function toDrawStats(
  sample: SceneRenderStats | undefined,
): ScriptRendererDrawStats | undefined {
  if (!sample) {
    return undefined;
  }
  return {
    drawCalls: sample.drawCalls,
    triangles: sample.triangles,
    canvas: sample.canvas,
    displayObjects: sample.displayObjects,
  };
}
