import { useEffect, useRef } from "react";
import type { ProjectListEntry } from "@game-editor/editor-core";

export function OpenProjectDialog({
  open,
  projects,
  activeProjectId,
  busy,
  error,
  onClose,
  onSelect,
}: {
  open: boolean;
  projects: ProjectListEntry[];
  activeProjectId: string | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-dialog-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-project-title"
      >
        <h2 id="open-project-title">Open Project</h2>
        <p>Select a game under the workspace to edit.</p>
        {error ? <p className="panel-error">{error}</p> : null}
        {projects.length === 0 && !error ? (
          <p className="panel-empty">No projects found.</p>
        ) : (
          <ul className="project-picker-list" role="listbox" aria-label="Projects">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <li key={project.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={
                      active
                        ? "project-picker-item project-picker-item-active"
                        : "project-picker-item"
                    }
                    disabled={busy || active}
                    onClick={() => onSelect(project.id)}
                  >
                    <span className="project-picker-name">{project.displayName}</span>
                    <span className="project-picker-id">{project.id}</span>
                    {active ? (
                      <span className="project-picker-badge">Current</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="modal-actions">
          <button
            ref={closeRef}
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
