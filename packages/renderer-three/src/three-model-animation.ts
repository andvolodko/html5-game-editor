import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
} from "three";
import { oneShotHoldTime } from "./one-shot-hold-time.js";
import type { ThreeGltfCache } from "./three-gltf-cache.js";
import {
  isPlaceholderObject,
} from "./three-gltf-cache.js";
import type { ThreeRuntimeEntry } from "./three-runtime-nodes.js";

function holdOneShotPose(action: AnimationAction, clip: AnimationClip): void {
  action.clampWhenFinished = true;
  action.enabled = true;
  action.paused = true;
  action.time = oneShotHoldTime(clip);
}

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
  entry.mixer.addEventListener("finished", (event) => {
    const action = (event as { action?: AnimationAction }).action;
    if (!action || action.loop !== LoopOnce) {
      return;
    }
    holdOneShotPose(action, action.getClip());
  });
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

  const clipChanged = entry.animationName !== clip.name;
  if (clipChanged) {
    entry.mixer.stopAllAction();
    entry.animationName = clip.name;
  }
  entry.boundClip = clip;
  entry.oneShotHoldTime = loop ? undefined : oneShotHoldTime(clip);
  const action = entry.mixer.clipAction(clip);
  action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.timeScale = timeScale;

  if (!loop && (!playing || (action.paused && action.time > 0 && !clipChanged))) {
    holdOneShotPose(action, clip);
    return;
  }

  if (clipChanged) {
    action.reset().play();
  } else if (playing && !action.isRunning()) {
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
  entry.boundClip = undefined;
  entry.oneShotHoldTime = undefined;
}

function clampOneShotHold(entry: ThreeRuntimeEntry): void {
  const mixer = entry.mixer;
  const clip = entry.boundClip;
  const hold = entry.oneShotHoldTime;
  if (!mixer || !clip || hold === undefined) {
    return;
  }
  const action = mixer.existingAction(clip);
  if (!action || action.loop !== LoopOnce) {
    return;
  }
  if (action.time + 1e-5 < hold) {
    return;
  }
  const overshot = action.time > hold + 1e-5;
  holdOneShotPose(action, clip);
  if (overshot) {
    mixer.update(0);
  }
}

export function updateMixers(
  entries: IterableIterator<[string, ThreeRuntimeEntry]>,
  dt: number,
): void {
  for (const [, entry] of entries) {
    if (!entry.mixer) {
      continue;
    }
    entry.mixer.update(dt);
    clampOneShotHold(entry);
  }
}
