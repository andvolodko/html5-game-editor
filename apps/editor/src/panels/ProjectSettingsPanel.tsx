import { useEffect, useState } from "react";
import type { SceneListEntry } from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { buildStartSceneSelectOptions } from "./fields/start-scene-select-options";

export function ProjectSettingsPanel() {
  const editor = useEditor();
  const project = useEditorState((ed) => ed.project.getProject());
  const status = useEditorState((ed) => ed.project.getStatus());
  const projectError = useEditorState((ed) => ed.project.getError());
  const projectRevision = useEditorState((ed) => ed.project.getRevision());
  const [scenes, setScenes] = useState<SceneListEntry[]>([]);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!editor.project.getProject()) {
          await editor.project.refresh();
        }
      } catch {
        // Surfaced via ProjectManager error.
      }
      try {
        const listed = await editor.listScenes();
        if (!cancelled) {
          setScenes(listed);
          setScenesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setScenesError(
            error instanceof Error ? error.message : "Failed to list scenes",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editor, projectRevision]);

  const options = buildStartSceneSelectOptions(
    scenes,
    project?.startScene,
  );
  const busy = status === "loading" || status === "saving";

  return (
    <div className="panel panel-project-settings">
      <p className="panel-hint">Project Settings</p>
      {project ? (
        <div className="inspector-grid">
          <label>
            Display Name
            <input value={project.displayName} readOnly disabled />
          </label>
          <label>
            Project Name
            <input value={project.name} readOnly disabled />
          </label>
          <label>
            Start Scene
            <select
              value={project.startScene}
              disabled={busy || options.length === 0}
              onChange={(event) => {
                const next = event.target.value;
                setSaveError(null);
                void editor.project.setStartScene(next).catch((error: unknown) => {
                  setSaveError(
                    error instanceof Error ? error.message : "Save failed",
                  );
                });
              }}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : status === "loading" ? (
        <p className="panel-empty">Loading project…</p>
      ) : (
        <p className="panel-empty">Project settings unavailable</p>
      )}
      {projectError ? <p className="panel-error">{projectError}</p> : null}
      {scenesError ? <p className="panel-error">{scenesError}</p> : null}
      {saveError ? <p className="panel-error">{saveError}</p> : null}
    </div>
  );
}
