import {
  DEFAULT_EDITOR_THEME,
  EDITOR_THEME_STORAGE_KEY,
  isEditorTheme,
  type EditorTheme,
} from "./theme";

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ThemeDocumentRoot {
  dataset: { theme?: string };
}

function resolveStorage(
  storage?: ThemeStorage,
): ThemeStorage | undefined {
  if (storage) {
    return storage;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function resolveRoot(root?: ThemeDocumentRoot): ThemeDocumentRoot | undefined {
  if (root) {
    return root;
  }
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.documentElement;
}

export function readStoredTheme(storage?: ThemeStorage): EditorTheme {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return DEFAULT_EDITOR_THEME;
  }
  try {
    const raw = resolved.getItem(EDITOR_THEME_STORAGE_KEY);
    return isEditorTheme(raw) ? raw : DEFAULT_EDITOR_THEME;
  } catch {
    return DEFAULT_EDITOR_THEME;
  }
}

export function writeStoredTheme(
  theme: EditorTheme,
  storage?: ThemeStorage,
): void {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return;
  }
  resolved.setItem(EDITOR_THEME_STORAGE_KEY, theme);
}

export function applyThemeToDocument(
  theme: EditorTheme,
  root?: ThemeDocumentRoot,
): void {
  const target = resolveRoot(root);
  if (!target) {
    return;
  }
  target.dataset.theme = theme;
}

export function applyPersistedEditorTheme(
  storage?: ThemeStorage,
  root?: ThemeDocumentRoot,
): EditorTheme {
  const theme = readStoredTheme(storage);
  applyThemeToDocument(theme, root);
  return theme;
}

export function setEditorTheme(
  theme: EditorTheme,
  storage?: ThemeStorage,
  root?: ThemeDocumentRoot,
): void {
  writeStoredTheme(theme, storage);
  applyThemeToDocument(theme, root);
}

/** Restore the saved theme and keep other windows (popouts) in sync. */
export function installEditorThemePersistence(
  storage?: ThemeStorage,
  root?: ThemeDocumentRoot,
): () => void {
  applyPersistedEditorTheme(storage, root);
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== EDITOR_THEME_STORAGE_KEY) {
      return;
    }
    applyPersistedEditorTheme(storage, root);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
