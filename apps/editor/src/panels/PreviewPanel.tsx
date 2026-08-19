import { useEffect, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview";
import type { SceneListEntry } from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import {
  isCrossWindowDockMove,
  isPopoutGroupLocation,
} from "../layout/dockview-popout";
import { GamePreviewSession } from "../preview/game-preview-session";
import { resolvePreviewScene } from "../preview/resolve-preview-scene";
import { buildStartSceneSelectOptions } from "./fields/start-scene-select-options";

type PreviewStatus = "idle" | "starting" | "running" | "error";

export function PreviewPanel({ api, containerApi }: IDockviewPanelProps) {
  const editor = useEditor();
  const editorSceneFileId = useEditorState((ed) => ed.getSceneFileId());
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(new GamePreviewSession());
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(() => api.isMaximized());
  const [locationType, setLocationType] = useState(api.location.type);
  const locationTypeRef = useRef(api.location.type);
  const [sceneEntries, setSceneEntries] = useState<readonly SceneListEntry[]>(
    [],
  );
  const [selectedSceneId, setSelectedSceneId] = useState(editorSceneFileId);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const session = sessionRef.current;
    return () => {
      void session.stop();
    };
  }, []);

  useEffect(() => {
    if (status === "running" || status === "starting") {
      return;
    }
    setSelectedSceneId(editorSceneFileId);
  }, [editorSceneFileId, status]);

  useEffect(() => {
    let cancelled = false;
    void editor
      .listScenes()
      .then((entries) => {
        if (!cancelled) {
          setSceneEntries(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSceneEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editor, editorSceneFileId]);

  useEffect(() => {
    setMaximized(api.isMaximized());
    const disposable = containerApi.onDidMaximizedGroupChange(() => {
      setMaximized(api.isMaximized());
    });
    return () => {
      disposable.dispose();
    };
  }, [api, containerApi]);

  useEffect(() => {
    locationTypeRef.current = api.location.type;
    setLocationType(api.location.type);
    const disposable = api.onDidLocationChange((event) => {
      const nextType = event.location.type;
      const previousType = locationTypeRef.current;
      locationTypeRef.current = nextType;
      setLocationType(nextType);
      if (!isCrossWindowDockMove(previousType, nextType)) {
        return;
      }
      void sessionRef.current.stop().then(() => {
        setStatus("idle");
        setPaused(false);
        setError(null);
      });
    });
    return () => {
      disposable.dispose();
    };
  }, [api]);

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
    setPaused(false);
    setStatus("starting");
    void resolvePreviewScene(editor, selectedSceneId)
      .then((snapshot) =>
        sessionRef.current.start({
          canvasParent: host,
          scene: snapshot,
          sceneId: selectedSceneId,
          assetResolver: editor.assets,
          resolution: project.resolution,
          background: project.background,
          components: editor.components,
          projectId: editor.project.getActiveProjectId(),
          loadSceneById: async (sceneId) => resolvePreviewScene(editor, sceneId),
          prefabs: editor.prefabs.getCatalog(),
          listScenes: async () => {
            const currentId = editor.getSceneFileId();
            const entries = await editor.listScenes();
            return Promise.all(
              entries.map((entry) =>
                entry.id === currentId
                  ? structuredClone(editor.getScene())
                  : editor.loadSceneData(entry.id),
              ),
            );
          },
          onSceneChange: (_scene, sceneId) => {
            setSelectedSceneId(sceneId);
          },
        }),
      )
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
      setPaused(false);
      setError(null);
    });
  };

  const handleTogglePause = () => {
    const session = sessionRef.current;
    if (!session.isRunning) {
      return;
    }
    const next = !session.isPaused;
    session.setPaused(next);
    setPaused(next);
  };

  const handleToggleMaximize = () => {
    if (api.isMaximized()) {
      api.exitMaximized();
    } else {
      api.maximize();
    }
    setMaximized(api.isMaximized());
  };

  const handlePreviewSceneChange = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    if (status !== "running") {
      return;
    }
    void sessionRef.current.changeScene(sceneId).catch((changeError: unknown) => {
      setStatus("error");
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Failed to change preview scene",
      );
    });
  };

  useEffect(() => {
    if (status !== "running") {
      return;
    }
    const session = sessionRef.current;
    return editor.subscribe(() => {
      session.syncScriptPropertiesFromScene(editor.getScene());
    });
  }, [editor, status]);

  const busy = status === "starting";
  const running = status === "running";
  const poppedOut = isPopoutGroupLocation({ type: locationType });

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
          disabled={!running}
          aria-pressed={paused}
          onClick={handleTogglePause}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="scene-toolbar-btn"
          disabled={!running && !busy}
          onClick={handleStop}
        >
          Stop
        </button>
        <span className="preview-toolbar-scene">
          <label className="preview-scene-label" htmlFor="preview-scene-select">
            Scene
          </label>
          <select
            id="preview-scene-select"
            className="preview-scene-select"
            value={selectedSceneId}
            disabled={busy}
            aria-label="Preview scene"
            onChange={(event) => handlePreviewSceneChange(event.target.value)}
          >
            {buildStartSceneSelectOptions(sceneEntries, selectedSceneId).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </span>
        {poppedOut ? null : (
          <button
            type="button"
            className="scene-toolbar-btn preview-expand-btn"
            aria-label={
              maximized
                ? "Restore preview panel size"
                : "Expand preview to full window"
            }
            title={maximized ? "Restore" : "Expand"}
            onClick={handleToggleMaximize}
          >
            {maximized ? "Restore" : "Expand"}
          </button>
        )}
      </div>
      <div ref={hostRef} className="preview-viewport">
        {!running && !busy ? (
          <p className="panel-empty preview-idle-hint">
            Press Play to preview the selected scene
          </p>
        ) : null}
        {busy ? (
          <p className="panel-empty preview-idle-hint">Starting previewù</p>
        ) : null}
      </div>
      {error ? <p className="panel-error preview-error">{error}</p> : null}
    </div>
  );
}
