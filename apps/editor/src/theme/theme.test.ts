import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_THEME,
  EDITOR_THEME_DEFINITIONS,
  EDITOR_THEMES,
  isEditorTheme,
} from "./theme";

describe("editor themes", () => {
  it("defaults to dark", () => {
    expect(DEFAULT_EDITOR_THEME).toBe("dark");
  });

  it("treats all 10 theme ids as valid", () => {
    expect(EDITOR_THEMES).toEqual([
      "dark",
      "light",
      "midnight",
      "nord",
      "dracula",
      "monokai",
      "solarized-dark",
      "solarized-light",
      "graphite",
      "ocean",
    ]);
    for (const id of EDITOR_THEMES) {
      expect(isEditorTheme(id)).toBe(true);
    }
  });

  it("rejects invalid theme ids", () => {
    expect(isEditorTheme("neon")).toBe(false);
    expect(isEditorTheme("Dark")).toBe(false);
    expect(isEditorTheme("")).toBe(false);
    expect(isEditorTheme(null)).toBe(false);
  });

  it("keeps metadata aligned with the theme id list", () => {
    expect(EDITOR_THEME_DEFINITIONS.map((theme) => theme.id)).toEqual([
      ...EDITOR_THEMES,
    ]);
    for (const definition of EDITOR_THEME_DEFINITIONS) {
      expect(definition.preview.length).toBeGreaterThanOrEqual(3);
      expect(definition.preview.length).toBeLessThanOrEqual(5);
    }
  });
});
