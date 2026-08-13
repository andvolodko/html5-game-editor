import type { AnimationClip, KeyframeTrack } from "three";

const VALUE_EPS = 1e-4;

function keyMatchesFirst(track: KeyframeTrack, index: number): boolean {
  const size = track.getValueSize();
  const values = track.values;
  const offset = index * size;
  for (let component = 0; component < size; component += 1) {
    const first = values[component] ?? 0;
    const current = values[offset + component] ?? 0;
    if (Math.abs(current - first) > VALUE_EPS) {
      return false;
    }
  }
  return true;
}

/**
 * Clip time to freeze a LoopOnce action on.
 *
 * MU / BMD clips often close the loop by repeating the first pose on the last
 * key. Holding `clip.duration` then shows a standing bind pose, not the death
 * (or other one-shot) pose in the middle.
 */
export function oneShotHoldTime(clip: AnimationClip): number {
  let hold = 0;
  for (const track of clip.tracks) {
    const times = track.times;
    const count = times.length;
    if (count === 0) {
      continue;
    }
    let index = count - 1;
    while (index > 0 && keyMatchesFirst(track, index)) {
      index -= 1;
    }
    hold = Math.max(hold, times[index] ?? 0);
  }
  if (hold > 0) {
    return hold;
  }
  return clip.duration > 0 ? clip.duration : 0;
}
