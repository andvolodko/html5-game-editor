import { describe, expect, it } from "vitest";
import {
  measurePlaybackParentSize,
  readGameLayoutSizeFromDataset,
  writeGameLayoutSize,
} from "./game-layout-size.js";

describe("game layout size", () => {
  it("round-trips dataset values", () => {
    const target = { dataset: {} as { gameLayoutWidth?: string; gameLayoutHeight?: string } };
    writeGameLayoutSize(target, { width: 412.4, height: 915.6 });
    expect(readGameLayoutSizeFromDataset(target)).toEqual({
      width: 412,
      height: 916,
    });
  });

  it("walks up to the frame dataset when clientHeight is stale", () => {
    const frame = {
      clientWidth: 412,
      clientHeight: 232,
      dataset: {} as { gameLayoutWidth?: string; gameLayoutHeight?: string },
      parentElement: null,
    };
    writeGameLayoutSize(frame, { width: 412, height: 915 });
    const layer = {
      clientWidth: 412,
      clientHeight: 232,
      dataset: {},
      parentElement: frame,
    };
    expect(measurePlaybackParentSize(layer)).toEqual({ width: 412, height: 915 });
  });

  it("falls back to the largest of client, rect, and style", () => {
    expect(
      measurePlaybackParentSize({
        clientWidth: 100,
        clientHeight: 50,
        dataset: {},
        parentElement: null,
        getBoundingClientRect: () => ({ width: 412, height: 200 }),
        style: { width: "412px", height: "915px" },
      }),
    ).toEqual({ width: 412, height: 915 });
  });
});
