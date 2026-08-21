import { describe, expect, it } from "vitest";
import { fitContainRect, fitCoverRect, fitDesignRect, fitExpandRect, integerExpandBuffer, playbackCameraForParent } from "./fit-contain-rect.js";

describe("fitContainRect", () => {
  it("letterboxes a wide design in a tall host", () => {
    const fitted = fitContainRect(
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    );
    expect(fitted.width).toBeCloseTo(800, 5);
    expect(fitted.height).toBeCloseTo(450, 5);
    expect(fitted.x).toBeCloseTo(0, 5);
    expect(fitted.y).toBeCloseTo(175, 5);
    expect(fitted.scale).toBeCloseTo(800 / 1280, 5);
  });

  it("pillarboxes a tall design in a wide host", () => {
    const fitted = fitContainRect(
      { width: 720, height: 1280 },
      { width: 1000, height: 500 },
    );
    expect(fitted.width).toBeCloseTo(281.25, 5);
    expect(fitted.height).toBeCloseTo(500, 5);
    expect(fitted.x).toBeCloseTo((1000 - 281.25) / 2, 5);
    expect(fitted.y).toBeCloseTo(0, 5);
  });

  it("fills when aspects match", () => {
    const fitted = fitContainRect(
      { width: 1920, height: 1080 },
      { width: 960, height: 540 },
    );
    expect(fitted).toEqual({
      width: 960,
      height: 540,
      x: 0,
      y: 0,
      scale: 0.5,
    });
  });

  it("returns zero size when host has no area", () => {
    expect(
      fitContainRect({ width: 1280, height: 720 }, { width: 0, height: 100 }),
    ).toEqual({ width: 0, height: 0, x: 0, y: 0, scale: 0 });
  });
});

describe("fitCoverRect", () => {
  it("covers a tall host and centers the design horizontally", () => {
    const fitted = fitCoverRect(
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    );
    expect(fitted.height).toBeCloseTo(800, 5);
    expect(fitted.width).toBeCloseTo((1280 * 800) / 720, 5);
    expect(fitted.x).toBeCloseTo((800 - fitted.width) / 2, 5);
    expect(fitted.y).toBeCloseTo(0, 5);
    expect(fitted.x).toBeLessThan(0);
    expect(fitted.scale).toBeCloseTo(800 / 720, 5);
  });

  it("covers a wide host and centers the design vertically", () => {
    const fitted = fitCoverRect(
      { width: 720, height: 1280 },
      { width: 1000, height: 500 },
    );
    expect(fitted.width).toBeCloseTo(1000, 5);
    expect(fitted.height).toBeCloseTo((1280 * 1000) / 720, 5);
    expect(fitted.x).toBeCloseTo(0, 5);
    expect(fitted.y).toBeCloseTo((500 - fitted.height) / 2, 5);
    expect(fitted.y).toBeLessThan(0);
  });

  it("matches contain when aspects match", () => {
    const design = { width: 1920, height: 1080 };
    const available = { width: 960, height: 540 };
    expect(fitCoverRect(design, available)).toEqual(
      fitContainRect(design, available),
    );
  });
});

describe("fitDesignRect", () => {
  it("dispatches contain, cover, and expand", () => {
    const design = { width: 1280, height: 720 };
    const available = { width: 800, height: 800 };
    expect(fitDesignRect(design, available, "contain")).toEqual(
      fitContainRect(design, available),
    );
    expect(fitDesignRect(design, available, "cover")).toEqual(
      fitCoverRect(design, available),
    );
    expect(fitDesignRect(design, available, "expand")).toEqual(
      fitExpandRect(design, available),
    );
  });
});

describe("fitExpandRect", () => {
  it("fills a tall host and centers the design vertically in extra world", () => {
    const fitted = fitExpandRect(
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    );
    expect(fitted.width).toBe(800);
    expect(fitted.height).toBe(800);
    expect(fitted.x).toBe(0);
    expect(fitted.y).toBe(0);
    expect(fitted.scale).toBeCloseTo(800 / 1280, 5);
    expect(fitted.visibleWidth).toBeCloseTo(1280, 5);
    expect(fitted.visibleHeight).toBeCloseTo(1280, 5);
    expect(fitted.offsetX).toBeCloseTo(0, 5);
    expect(fitted.offsetY).toBeCloseTo((1280 - 720) / 2, 5);
  });

  it("fills a wide host and centers the design horizontally in extra world", () => {
    const fitted = fitExpandRect(
      { width: 720, height: 1280 },
      { width: 1000, height: 500 },
    );
    expect(fitted.width).toBe(1000);
    expect(fitted.height).toBe(500);
    expect(fitted.visibleHeight).toBeCloseTo(1280, 5);
    expect(fitted.visibleWidth).toBeCloseTo(2560, 5);
    expect(fitted.offsetY).toBeCloseTo(0, 5);
    expect(fitted.offsetX).toBeCloseTo((2560 - 720) / 2, 5);
  });

  it("expands a landscape design into a portrait phone box", () => {
    const fitted = fitExpandRect(
      { width: 1920, height: 1080 },
      { width: 360, height: 800 },
    );
    expect(fitted.width).toBe(360);
    expect(fitted.height).toBe(800);
    expect(fitted.scale).toBeCloseTo(360 / 1920, 5);
    expect(fitted.visibleWidth).toBeCloseTo(1920, 5);
    expect(fitted.visibleHeight).toBeCloseTo(800 / (360 / 1920), 5);
    expect(fitted.offsetX).toBeCloseTo(0, 5);
  });

  it("matches contain when aspects match", () => {
    const design = { width: 1920, height: 1080 };
    const available = { width: 960, height: 540 };
    const fitted = fitExpandRect(design, available);
    expect(fitted.visibleWidth).toBeCloseTo(1920, 5);
    expect(fitted.visibleHeight).toBeCloseTo(1080, 5);
    expect(fitted.offsetX).toBeCloseTo(0, 5);
    expect(fitted.offsetY).toBeCloseTo(0, 5);
    expect(fitted.scale).toBe(0.5);
  });

  it("rounds to an integer buffer with centered pan", () => {
    const buffer = integerExpandBuffer(
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    );
    expect(buffer.width).toBe(1280);
    expect(buffer.height).toBe(1280);
    expect(buffer.panX).toBe(0);
    expect(buffer.panY).toBe(280);
  });

  it("rounds a portrait phone expand buffer without stretching", () => {
    const buffer = integerExpandBuffer(
      { width: 1920, height: 1080 },
      { width: 360, height: 800 },
    );
    expect(buffer.width).toBe(1920);
    expect(buffer.height).toBe(Math.round(800 / (360 / 1920)));
    expect(buffer.panX).toBe(0);
  });
});

describe("playbackCameraForParent", () => {
  it("uses the CSS parent size and centers a landscape design in portrait", () => {
    const view = playbackCameraForParent(
      { width: 1920, height: 1080 },
      { width: 412, height: 915 },
    );
    expect(view.width).toBe(412);
    expect(view.height).toBe(915);
    expect(view.scale).toBeCloseTo(412 / 1920, 5);
    expect(view.panX).toBeCloseTo(0, 5);
    expect(view.panY).toBeCloseTo((915 - 1080 * (412 / 1920)) / 2, 5);
  });
});
