import { describe, expect, it } from "vitest";
import { resolveGameViteBase } from "./define-game-vite-config.js";

describe("resolveGameViteBase", () => {
  it("defaults to the site root when VITE_BASE is unset", () => {
    expect(resolveGameViteBase(undefined)).toBe("/");
    expect(resolveGameViteBase("")).toBe("/");
  });

  it("passes through a GitHub Pages subdirectory", () => {
    expect(resolveGameViteBase("/html5-game-editor/games/editor-features-demo/")).toBe(
      "/html5-game-editor/games/editor-features-demo/",
    );
  });
});
