import { describe, expect, it } from "vitest";
import {
  clientPointToLetterboxNdc,
  computeDesignLetterbox,
  designCameraAspect,
  letterboxToThreeViewport,
} from "./three-design-viewport.js";

const DESIGN = { width: 1920, height: 1080 };

describe("computeDesignLetterbox", () => {
  it("fills the canvas when aspects match", () => {
    expect(computeDesignLetterbox(DESIGN, { width: 960, height: 540 })).toEqual({
      x: 0,
      y: 0,
      width: 960,
      height: 540,
    });
  });

  it("letterboxes a landscape design in a tall canvas", () => {
    const box = computeDesignLetterbox(DESIGN, { width: 400, height: 800 });
    expect(box.width).toBe(400);
    expect(box.height).toBe(225);
    expect(box.x).toBe(0);
    expect(box.y).toBe(Math.round((800 - 225) / 2));
  });

  it("pillarboxes a landscape design in a wide canvas", () => {
    const box = computeDesignLetterbox(DESIGN, { width: 1600, height: 400 });
    expect(box).toEqual({ x: 444, y: 0, width: 711, height: 400 });
  });
});

describe("letterboxToThreeViewport", () => {
  it("flips Y so Three measures from the buffer bottom", () => {
    expect(
      letterboxToThreeViewport(
        { x: 0, y: 288, width: 400, height: 225 },
        800,
      ),
    ).toEqual({ x: 0, y: 287, width: 400, height: 225 });
  });
});

describe("designCameraAspect", () => {
  it("keeps the authored design aspect", () => {
    expect(designCameraAspect(DESIGN)).toBeCloseTo(1920 / 1080);
  });
});

describe("clientPointToLetterboxNdc", () => {
  const canvasRect = { left: 0, top: 0, width: 400, height: 800 };
  const canvasSize = { width: 400, height: 800 };
  const box = computeDesignLetterbox(DESIGN, canvasSize);

  it("maps the letterbox center to NDC origin", () => {
    const ndc = clientPointToLetterboxNdc(
      box.x + box.width / 2,
      box.y + box.height / 2,
      canvasRect,
      box,
      canvasSize,
    );
    expect(ndc?.x).toBeCloseTo(0);
    expect(ndc?.y).toBeCloseTo(0);
  });

  it("ignores clicks in the unused vertical bands", () => {
    expect(
      clientPointToLetterboxNdc(200, 10, canvasRect, box, canvasSize),
    ).toBeUndefined();
    expect(
      clientPointToLetterboxNdc(200, 790, canvasRect, box, canvasSize),
    ).toBeUndefined();
  });
});
