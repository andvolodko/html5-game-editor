import { describe, expect, it } from "vitest";
import {
  clampMenuPosition,
  CONTEXT_MENU_VIEWPORT_MARGIN_PX,
} from "./clamp-menu-position";

const MARGIN = CONTEXT_MENU_VIEWPORT_MARGIN_PX;

describe("clampMenuPosition", () => {
  it("keeps the cursor position when the menu fits", () => {
    expect(
      clampMenuPosition({
        x: 40,
        y: 50,
        width: 140,
        height: 120,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 40, y: 50 });
  });

  it("flips above the cursor when it would overflow the bottom", () => {
    expect(
      clampMenuPosition({
        x: 20,
        y: 560,
        width: 140,
        height: 120,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 20, y: 440 });
  });

  it("flips left of the cursor when it would overflow the right", () => {
    expect(
      clampMenuPosition({
        x: 750,
        y: 40,
        width: 140,
        height: 80,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 610, y: 40 });
  });

  it("clamps into the viewport when the menu is taller than the window", () => {
    expect(
      clampMenuPosition({
        x: 10,
        y: 500,
        width: 140,
        height: 700,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 10, y: MARGIN });
  });
});
