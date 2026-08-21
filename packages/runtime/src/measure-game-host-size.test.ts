import { describe, expect, it } from "vitest";
import {
  isInlineFullscreenHost,
  pinFullscreenHostBox,
  readVisibleViewportRect,
  resolveGameHostSize,
} from "./measure-game-host-size.js";

describe("resolveGameHostSize", () => {
  it("keeps a nested preview panel that disagrees with the window orientation", () => {
    expect(
      resolveGameHostSize(
        { width: 400, height: 800 },
        { width: 1920, height: 1080 },
      ),
    ).toEqual({ width: 400, height: 800 });
  });

  it("uses the visible viewport when the host box is swapped (Android rotate)", () => {
    expect(
      resolveGameHostSize(
        { width: 800, height: 360 },
        { width: 360, height: 800 },
      ),
    ).toEqual({ width: 360, height: 800 });
  });

  it("uses the visible viewport when a near-fullscreen host disagrees in orientation", () => {
    expect(
      resolveGameHostSize(
        { width: 800, height: 336 },
        { width: 360, height: 800 },
      ),
    ).toEqual({ width: 360, height: 800 });
  });

  it("falls back to the viewport when the host has no area", () => {
    expect(
      resolveGameHostSize({ width: 0, height: 0 }, { width: 360, height: 800 }),
    ).toEqual({ width: 360, height: 800 });
  });

  it("keeps a matching portrait host box", () => {
    expect(
      resolveGameHostSize(
        { width: 360, height: 800 },
        { width: 360, height: 800 },
      ),
    ).toEqual({ width: 360, height: 800 });
  });
});

describe("readVisibleViewportRect", () => {
  it("prefers visualViewport including offset", () => {
    expect(
      readVisibleViewportRect({
        innerWidth: 400,
        innerHeight: 900,
        visualViewport: {
          width: 360.4,
          height: 800.6,
          offsetLeft: 0.2,
          offsetTop: 12.8,
        },
      }),
    ).toEqual({ x: 0, y: 13, width: 360, height: 801 });
  });

  it("falls back to innerWidth/innerHeight", () => {
    expect(
      readVisibleViewportRect({ innerWidth: 360, innerHeight: 800 }),
    ).toEqual({ x: 0, y: 0, width: 360, height: 800 });
  });
});

describe("fullscreen host pin", () => {
  it("detects inset-0 fixed hosts used by standalone games", () => {
    expect(
      isInlineFullscreenHost({
        position: "fixed",
        inset: "0",
        top: "",
        right: "",
        bottom: "",
        left: "",
        width: "",
        height: "",
      }),
    ).toBe(true);
    expect(
      isInlineFullscreenHost({
        position: "",
        inset: "",
        top: "",
        right: "",
        bottom: "",
        left: "",
        width: "",
        height: "",
      }),
    ).toBe(false);
  });

  it("writes an explicit pixel box", () => {
    const style = {
      position: "fixed",
      inset: "0",
      top: "",
      right: "",
      bottom: "",
      left: "",
      width: "",
      height: "",
    };
    pinFullscreenHostBox(style, { x: 0, y: 12, width: 360, height: 788 });
    expect(style.inset).toBe("");
    expect(style.left).toBe("0px");
    expect(style.top).toBe("12px");
    expect(style.width).toBe("360px");
    expect(style.height).toBe("788px");
    expect(style.right).toBe("auto");
    expect(style.bottom).toBe("auto");
  });
});
