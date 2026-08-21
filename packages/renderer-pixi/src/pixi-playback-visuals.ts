import { AnimatedSprite, type Container, type Ticker } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { getSpine, type SceneNodeData } from "@game-editor/scene";
import { isParticleEmitterView } from "./visuals/particle-emitter-view.js";

const MS_PER_SECOND = 1000;

export interface PlaybackVisualNode {
  visual?: Container;
  node: SceneNodeData;
}

function isSpineView(view: Container): view is Spine {
  return view instanceof Spine;
}

/**
 * Spine `autoUpdate` and AnimatedSprite `play()` attach to `Ticker.shared`,
 * not the Application ticker. Pause must detach them or they keep advancing
 * while preview still presents frames.
 */
export function detachSharedTickerVisuals(
  nodes: Iterable<PlaybackVisualNode>,
): void {
  for (const runtime of nodes) {
    const view = runtime.visual;
    if (!view) {
      continue;
    }
    if (view instanceof AnimatedSprite) {
      view.autoUpdate = false;
      continue;
    }
    if (isSpineView(view)) {
      view.autoUpdate = false;
    }
  }
}

/** Advance host-driven Spine / AnimatedSprite / ParticleEmitter from the Application ticker. */
export function advanceHostDrivenVisuals(
  nodes: Iterable<PlaybackVisualNode>,
  ticker: Ticker,
): void {
  const deltaSeconds = ticker.deltaMS / MS_PER_SECOND;
  for (const runtime of nodes) {
    const view = runtime.visual;
    if (!view) {
      continue;
    }
    if (view instanceof AnimatedSprite) {
      if (view.playing) {
        view.update(ticker);
      }
      continue;
    }
    if (isSpineView(view) && getSpine(runtime.node)?.playing !== false) {
      view.update(deltaSeconds);
      continue;
    }
    if (isParticleEmitterView(view)) {
      view.update(deltaSeconds);
    }
  }
}
