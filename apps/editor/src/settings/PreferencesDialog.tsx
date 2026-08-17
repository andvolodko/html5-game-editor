import { useEffect, useRef, useState } from "react";
import { ThemePicker } from "./ThemePicker";
import { readStoredTheme, setEditorTheme } from "../theme/themeStorage";
import type { EditorTheme } from "../theme/theme";

export function PreferencesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [theme, setTheme] = useState<EditorTheme>(() => readStoredTheme());

  useEffect(() => {
    if (!open) {
      return;
    }
    setTheme(readStoredTheme());
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-dialog-preferences"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
      >
        <h2 id="preferences-title">Preferences</h2>
        <section className="preferences-section" aria-labelledby="appearance-heading">
          <h3 id="appearance-heading">Appearance</h3>
          <p className="preferences-section-hint">
            Theme applies to the editor chrome only. Scene and game rendering stay
            unchanged.
          </p>
          <ThemePicker
            value={theme}
            onChange={(next) => {
              setEditorTheme(next);
              setTheme(next);
            }}
          />
        </section>
        <div className="modal-actions">
          <button ref={closeRef} type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
