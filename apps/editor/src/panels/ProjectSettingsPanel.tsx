import { useEffect, useState } from "react";
import {
  uniquePanelErrorMessages,
  type SceneListEntry,
} from "@game-editor/editor-core";
import {
  DEFAULT_PROJECT_BACKGROUND,
  normalizeProjectBackgroundHex,
} from "@game-editor/project";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { buildStartSceneSelectOptions } from "./fields/start-scene-select-options";

const RESOLUTION_MIN = 1;

export function ProjectSettingsPanel() {
  const editor = useEditor();
  const project = useEditorState((ed) => ed.project.getProject());
  const status = useEditorState((ed) => ed.project.getStatus());
  const projectError = useEditorState((ed) => ed.project.getError());
  const projectRevision = useEditorState((ed) => ed.project.getRevision());
  const [scenes, setScenes] = useState<SceneListEntry[]>([]);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [widthDraft, setWidthDraft] = useState("");
  const [heightDraft, setHeightDraft] = useState("");
  const [backgroundDraft, setBackgroundDraft] = useState(
    DEFAULT_PROJECT_BACKGROUND,
  );

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

  useEffect(() => {
    if (!project) {
      setWidthDraft("");
      setHeightDraft("");
      setBackgroundDraft(DEFAULT_PROJECT_BACKGROUND);
      return;
    }
    setWidthDraft(String(project.resolution.width));
    setHeightDraft(String(project.resolution.height));
    setBackgroundDraft(project.background);
  }, [project, projectRevision]);

  const options = buildStartSceneSelectOptions(
    scenes,
    project?.startScene,
  );
  const busy = status === "loading" || status === "saving";

  const commitResolution = (): void => {
    if (!project) {
      return;
    }
    const width = Number.parseInt(widthDraft, 10);
    const height = Number.parseInt(heightDraft, 10);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < RESOLUTION_MIN ||
      height < RESOLUTION_MIN
    ) {
      setWidthDraft(String(project.resolution.width));
      setHeightDraft(String(project.resolution.height));
      setSaveError("Resolution width and height must be positive integers");
      return;
    }
    if (
      width === project.resolution.width &&
      height === project.resolution.height
    ) {
      return;
    }
    setSaveError(null);
    void editor.project.setResolution(width, height).catch((error: unknown) => {
      setWidthDraft(String(project.resolution.width));
      setHeightDraft(String(project.resolution.height));
      setSaveError(error instanceof Error ? error.message : "Save failed");
    });
  };

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
          <label>
            Resolution Width
            <input
              type="number"
              min={RESOLUTION_MIN}
              step={1}
              value={widthDraft}
              disabled={busy}
              onChange={(event) => {
                setWidthDraft(event.target.value);
              }}
              onBlur={commitResolution}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
          <label>
            Resolution Height
            <input
              type="number"
              min={RESOLUTION_MIN}
              step={1}
              value={heightDraft}
              disabled={busy}
              onChange={(event) => {
                setHeightDraft(event.target.value);
              }}
              onBlur={commitResolution}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
          <label>
            Background
            <input
              type="color"
              value={backgroundDraft}
              disabled={busy}
              onChange={(event) => {
                const next = normalizeProjectBackgroundHex(event.target.value);
                if (!next || !project) {
                  return;
                }
                setBackgroundDraft(next);
                if (next === project.background) {
                  return;
                }
                setSaveError(null);
                void editor.project.setBackground(next).catch((error: unknown) => {
                  setBackgroundDraft(project.background);
                  setSaveError(
                    error instanceof Error ? error.message : "Save failed",
                  );
                });
              }}
            />
          </label>
        </div>
      ) : status === "loading" ? (
        <p className="panel-empty">Loading project…</p>
      ) : (
        <p className="panel-empty">Project settings unavailable</p>
      )}
      {uniquePanelErrorMessages(projectError, scenesError, saveError).map(
        (message) => (
          <p key={message} className="panel-error">
            {message}
          </p>
        ),
      )}
    </div>
  );
}
