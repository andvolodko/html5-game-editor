import { describe, expect, it } from "vitest";
import {
  AnimationClip,
  AnimationMixer,
  Object3D,
  VectorKeyframeTrack,
} from "three";
import { syncModelAnimation, updateMixers } from "./three-model-animation.js";
import type { ThreeGltfCache } from "./three-gltf-cache.js";
import type { ThreeRuntimeEntry } from "./three-runtime-nodes.js";

function makeClip(name: string, duration: number): AnimationClip {
  return new AnimationClip(name, duration, [
    new VectorKeyframeTrack(".position", [0, duration], [0, 0, 0, 0, 1, 0]),
  ]);
}

function makeLoopClosedClip(name: string, duration: number): AnimationClip {
  const mid = duration * 0.5;
  const hold = duration * 0.9;
  return new AnimationClip(name, duration, [
    new VectorKeyframeTrack(
      ".position",
      [0, mid, hold, duration],
      [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    ),
  ]);
}

function mixerEntries(
  entry: ThreeRuntimeEntry,
): IterableIterator<[string, ThreeRuntimeEntry]> {
  return new Map([["n", entry]]).entries();
}

describe("syncModelAnimation", () => {
  it("keeps a finished LoopOnce clip on the last frame when paused", () => {
    const object = new Object3D();
    const clip = makeClip("die", 1);
    const mixer = new AnimationMixer(object);
    const entry: ThreeRuntimeEntry = {
      object,
      parentId: undefined,
      kind: "Model3D",
      assetId: "asset_m",
      mixer,
      playback: {
        animation: "die",
        loop: false,
        timeScale: 1,
        playing: true,
      },
    };
    const cache = {} as ThreeGltfCache;

    syncModelAnimation(entry, cache, [clip]);
    mixer.update(1.05);
    expect(mixer.clipAction(clip).time).toBeGreaterThan(0.9);

    entry.playback = {
      animation: "die",
      loop: false,
      timeScale: 1,
      playing: false,
    };
    syncModelAnimation(entry, cache, [clip]);
    expect(mixer.clipAction(clip).time).toBeCloseTo(1, 3);
  });

  it("does not restart a finished LoopOnce while still marked playing", () => {
    const object = new Object3D();
    const clip = makeClip("die", 1);
    const mixer = new AnimationMixer(object);
    const entry: ThreeRuntimeEntry = {
      object,
      parentId: undefined,
      kind: "Model3D",
      assetId: "asset_m",
      mixer,
      playback: {
        animation: "die",
        loop: false,
        timeScale: 1,
        playing: true,
      },
    };
    const cache = {} as ThreeGltfCache;
    syncModelAnimation(entry, cache, [clip]);
    mixer.update(1.05);
    syncModelAnimation(entry, cache, [clip]);
    expect(mixer.clipAction(clip).paused).toBe(true);
    expect(mixer.clipAction(clip).time).toBeCloseTo(1, 3);
  });

  it("holds a loop-closed one-shot on the pose before the trailing bind key", () => {
    const object = new Object3D();
    const clip = makeLoopClosedClip("die", 1);
    const mixer = new AnimationMixer(object);
    const entry: ThreeRuntimeEntry = {
      object,
      parentId: undefined,
      kind: "Model3D",
      assetId: "asset_m",
      mixer,
      playback: {
        animation: "die",
        loop: false,
        timeScale: 0.6,
        playing: true,
      },
    };
    const cache = {} as ThreeGltfCache;
    syncModelAnimation(entry, cache, [clip]);
    updateMixers(mixerEntries(entry), 2);

    const action = mixer.existingAction(clip);
    expect(action?.paused).toBe(true);
    expect(action?.time).toBeCloseTo(0.9, 3);
  });
});
