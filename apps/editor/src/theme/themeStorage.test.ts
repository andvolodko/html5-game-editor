import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EDITOR_THEME,
  EDITOR_THEME_STORAGE_KEY,
  EDITOR_THEMES,
} from "./theme";
import {
  applyPersistedEditorTheme,
  applyThemeToDocument,
  installEditorThemePersistence,
  readStoredTheme,
  setEditorTheme,
  writeStoredTheme,
  type ThemeDocumentRoot,
} from "./themeStorage";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key() {
      return null;
    },
  };
}

function fakeRoot(theme?: string): ThemeDocumentRoot {
  return { dataset: theme ? { theme } : {} };
}

describe("editor theme storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to dark when storage is empty", () => {
    expect(readStoredTheme(memoryStorage())).toBe(DEFAULT_EDITOR_THEME);
  });

  it("restores a valid stored theme", () => {
    const storage = memoryStorage({
      [EDITOR_THEME_STORAGE_KEY]: "graphite",
    });
    expect(readStoredTheme(storage)).toBe("graphite");
  });

  it("falls back to dark for an invalid stored value", () => {
    const storage = memoryStorage({
      [EDITOR_THEME_STORAGE_KEY]: "neon-city",
    });
    expect(readStoredTheme(storage)).toBe("dark");
  });

  it("persists theme changes to storage", () => {
    const storage = memoryStorage();
    writeStoredTheme("nord", storage);
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe("nord");
  });

  it("updates the root data-theme attribute", () => {
    const root = fakeRoot("dark");
    applyThemeToDocument("ocean", root);
    expect(root.dataset.theme).toBe("ocean");
  });

  it("applies a theme change to the root and localStorage", () => {
    const storage = memoryStorage();
    const root = fakeRoot("dark");
    setEditorTheme("light", storage, root);
    expect(root.dataset.theme).toBe("light");
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe("light");
  });

  it("restores the persisted theme during bootstrap", () => {
    const storage = memoryStorage({
      [EDITOR_THEME_STORAGE_KEY]: "midnight",
    });
    const root = fakeRoot("dark");
    expect(applyPersistedEditorTheme(storage, root)).toBe("midnight");
    expect(root.dataset.theme).toBe("midnight");
  });

  it("bootstraps dark when the stored value is invalid", () => {
    const storage = memoryStorage({
      [EDITOR_THEME_STORAGE_KEY]: "not-a-theme",
    });
    const root = fakeRoot();
    expect(applyPersistedEditorTheme(storage, root)).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("reapplies the stored theme when another window writes storage", () => {
    const storage = memoryStorage({
      [EDITOR_THEME_STORAGE_KEY]: "dark",
    });
    const root = fakeRoot("dark");
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    });

    const dispose = installEditorThemePersistence(storage, root);
    storage.setItem(EDITOR_THEME_STORAGE_KEY, "dracula");
    const listener = listeners.get("storage");
    listener?.({ key: EDITOR_THEME_STORAGE_KEY } as StorageEvent);
    expect(root.dataset.theme).toBe("dracula");
    dispose();
  });
});

describe("theme bootstrap markup", () => {
  it("applies the persisted theme from index.html before the editor module", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    expect(html).toContain(`data-theme="${DEFAULT_EDITOR_THEME}"`);
    expect(html).toContain(EDITOR_THEME_STORAGE_KEY);
    for (const id of EDITOR_THEMES) {
      expect(html).toContain(`"${id}"`);
    }
  });

  it("applies the persisted theme from popout.html", () => {
    const html = readFileSync(
      new URL("../../public/popout.html", import.meta.url),
      "utf8",
    );
    expect(html).toContain(`data-theme="${DEFAULT_EDITOR_THEME}"`);
    expect(html).toContain(EDITOR_THEME_STORAGE_KEY);
    for (const id of EDITOR_THEMES) {
      expect(html).toContain(`"${id}"`);
    }
  });

  it("defines CSS variables for every theme id", () => {
    const css = readFileSync(new URL("./themes.css", import.meta.url), "utf8");
    for (const id of EDITOR_THEMES) {
      expect(css).toContain(`[data-theme="${id}"]`);
    }
  });
});
