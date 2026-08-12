import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  type AnimationClip,
} from "three";
import type { ThreeGltfCache } from "./three-gltf-cache.js";
import {
  isPlaceholderObject,
} from "./three-gltf-cache.js";
import type { ThreeRuntimeEntry } from "./three-runtime-nodes.js";

/** Create mixer + apply clip playback from entry.playback. */
export function bindModelAnimation(
  entry: ThreeRuntimeEntry,
  cache: ThreeGltfCache,
): void {
  if (!entry.assetId || isPlaceholderObject(entry.object)) {
    return;
  }
  const clips = cache.getClips(entry.assetId);
  if (clips.length === 0) {
    return;
  }
  entry.mixer = new AnimationMixer(entry.object);
  syncModelAnimation(entry, cache, clips);
}

/** Update clip / loop / timeScale / playing on an existing mixer. */
export function syncModelAnimation(
  entry: ThreeRuntimeEntry,
  cache: ThreeGltfCache,
  clips?: AnimationClip[],
): void {
  if (!entry.assetId || !entry.mixer) {
    if (entry.assetId && !entry.mixer && !isPlaceholderObject(entry.object)) {
      bindModelAnimation(entry, cache);
    }
    return;
  }
  const available = clips ?? cache.getClips(entry.assetId);
  if (available.length === 0) {
    return;
  }
  const requested = entry.playback?.animation;
  const clip =
    (requested
      ? available.find((c) => c.name === requested)
      : undefined) ?? available[0];
  if (!clip) {
    return;
  }
  const loop = entry.playback?.loop !== false;
  const timeScale = entry.playback?.timeScale ?? 1;
  const playing = entry.playback?.playing !== false;

  if (entry.animationName !== clip.name) {
    entry.mixer.stopAllAction();
    entry.animationName = clip.name;
  }
  const action = entry.mixer.clipAction(clip);
  action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.timeScale = timeScale;
  if (!action.isRunning()) {
    action.reset().play();
  }
  action.paused = !playing;
}

export function disposeMixer(entry: ThreeRuntimeEntry): void {
  if (!entry.mixer) {
    return;
  }
  entry.mixer.stopAllAction();
  entry.mixer.uncacheRoot(entry.object);
  entry.mixer = undefined;
  entry.animationName = undefined;
}

export function updateMixers(
  entries: IterableIterator<[string, ThreeRuntimeEntry]>,
  dt: number,
): void {
  for (const [, entry] of entries) {
    if (entry.mixer) {
      entry.mixer.update(dt);
    }
  }
}
