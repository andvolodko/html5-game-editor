import { useEffect, useRef } from "react";

export type UnsavedChangesChoice = "save" | "discard" | "cancel";

export function UnsavedChangesDialog({
  open,
  sceneName,
  busy,
  onChoice,
}: {
  open: boolean;
  sceneName: string;
  busy?: boolean;
  onChoice: (choice: UnsavedChangesChoice) => void;
}) {
  const saveRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    saveRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onChoice("cancel");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onChoice]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
      >
        <h2 id="unsaved-title">Unsaved changes</h2>
        <p id="unsaved-desc">
          Scene &ldquo;{sceneName}&rdquo; has unsaved changes. Save before
          continuing?
        </p>
        <div className="modal-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoice("cancel")}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoice("discard")}
          >
            Don&apos;t Save
          </button>
          <button
            ref={saveRef}
            type="button"
            className="modal-primary"
            disabled={busy}
            onClick={() => onChoice("save")}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
