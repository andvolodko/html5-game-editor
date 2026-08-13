import { describe, expect, it } from "vitest";
import { AnimationClip, VectorKeyframeTrack } from "three";
import { oneShotHoldTime } from "./one-shot-hold-time.js";

describe("oneShotHoldTime", () => {
  it("uses the last key when the clip does not return to the start pose", () => {
    const clip = new AnimationClip("die", 1, [
      new VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 0, 1, 0]),
    ]);
    expect(oneShotHoldTime(clip)).toBeCloseTo(1, 5);
  });

  it("skips a trailing key that repeats the first pose", () => {
    const clip = new AnimationClip("die", 0.875, [
      new VectorKeyframeTrack(
        ".position",
        [0, 0.5, 0.8333, 0.875],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      ),
    ]);
    expect(oneShotHoldTime(clip)).toBeCloseTo(0.8333, 4);
  });
});
