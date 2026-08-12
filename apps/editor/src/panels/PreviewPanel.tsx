import { useEffect, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { GamePreviewSession } from "../preview/game-preview-session";

type PreviewStatus = "idle" | "starting" | "running" | "error";

export function PreviewPanel({ api, containerApi }: IDockviewPanelProps) {
  const editor = useEditor();
  const sceneName = useEditorState((ed) => ed.getScene().name);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(new GamePreviewSession());
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(() => api.isMaximized());

  useEffect(() => {
    const session = sessionRef.current;
    return () => {
      void session.stop();
    };
  }, []);

  useEffect(() => {
    setMaximized(api.isMaximized());
    const disposable = containerApi.onDidMaximizedGroupChange(() => {
      setMaximized(api.isMaximized());
    });
    return () => {
      disposable.dispose();
    };
  }, [api, containerApi]);

  const handlePlay = () => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const project = editor.project.getProject();
    if (!project) {
      setStatus("error");
      setError("Project settings are not loaded");
      return;
    }
    setError(null);
    setStatus("starting");
    const snapshot = structuredClone(editor.getScene());
    void sessionRef.current
      .start({
        canvasParent: host,
        scene: snapshot,
        assetResolver: editor.assets,
        resolution: project.resolution,
        background: project.background,
        components: editor.components,
        projectId: editor.project.getActiveProjectId(),
        loadSceneById: async (sceneId) => editor.loadSceneData(sceneId),
      })
      .then(() => {
        if (sessionRef.current.isRunning) {
          setStatus("running");
        } else {
          setStatus("idle");
        }
      })
      .catch((startError: unknown) => {
        setStatus("error");
        setError(
          startError instanceof Error
            ? startError.message
            : "Failed to start preview",
        );
      });
  };

  const handleStop = () => {
    void sessionRef.current.stop().then(() => {
      setStatus("idle");
      setError(null);
    });
  };

  const handleToggleMaximize = () => {
    if (api.isMaximized()) {
      api.exitMaximized();
    } else {
      api.maximize();
    }
    setMaximized(api.isMaximized());
  };

  const busy = status === "starting";
  const running = status === "running";

  return (
    <div className="panel panel-preview">
      <div className="preview-toolbar">
        <button
          type="button"
          className="scene-toolbar-btn"
          disabled={busy || running}
          onClick={handlePlay}
        >
          Play
        </button>
        <button
          type="button"
          className="scene-toolbar-btn"
          disabled={!running && !busy}
          onClick={handleStop}
        >
          Stop
        </button>
        <span className="preview-toolbar-scene">{sceneName}</span>
        <button
          type="button"
          className="scene-toolbar-btn preview-expand-btn"
          aria-label={
            maximized ? "Restore preview panel size" : "Expand preview to full window"
          }
          title={maximized ? "Restore" : "Expand"}
          onClick={handleToggleMaximize}
        >
          {maximized ? "Restore" : "Expand"}
        </button>
      </div>
      <div ref={hostRef} className="preview-viewport">
        {!running && !busy ? (
          <p className="panel-empty preview-idle-hint">
            Press Play to preview the current scene
          </p>
        ) : null}
        {busy ? (
          <p className="panel-empty preview-idle-hint">Starting preview…</p>
        ) : null}
      </div>
      {error ? <p className="panel-error preview-error">{error}</p> : null}
    </div>
  );
}
