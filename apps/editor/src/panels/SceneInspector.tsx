import { useEffect, useState } from "react";
import { getSceneRendererKind } from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { InspectorFieldRow } from "./fields/inspector-fields";

export function SceneInspector() {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const [sceneNameDraft, setSceneNameDraft] = useState(scene.name);

  useEffect(() => {
    setSceneNameDraft(scene.name);
  }, [scene.id, scene.name]);

  const commitSceneName = () => {
    const trimmed = sceneNameDraft.trim();
    if (trimmed.length === 0 || trimmed === scene.name) {
      setSceneNameDraft(scene.name);
      return;
    }
    editor.renameScene(trimmed);
  };
  const rendererKind = getSceneRendererKind(scene);

  return (
    <div className="panel panel-inspector">
      <p className="panel-hint">Inspector · Scene</p>
      <section className="inspector-section">
        <h3>Scene</h3>
        <div className="inspector-grid">
          <InspectorFieldRow>
            <label>
              Name
              <input
                value={sceneNameDraft}
                onChange={(event) => setSceneNameDraft(event.target.value)}
                onBlur={commitSceneName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitSceneName();
                  }
                }}
              />
            </label>
            <label>
              Renderer
              <select
                value={rendererKind}
                onChange={(event) => {
                  const next = event.target.value;
                  if (
                    next === "pixi" ||
                    next === "three" ||
                    next === "hybrid"
                  ) {
                    editor.setSceneRenderer(next);
                  }
                }}
              >
                <option value="pixi">PixiJS (2D)</option>
                <option value="three">Three.js (3D)</option>
                <option value="hybrid">Hybrid (Pixi + Three)</option>
              </select>
            </label>
          </InspectorFieldRow>
        </div>
        <dl className="inspector-meta">
          <div>
            <dt>Scene ID</dt>
            <dd className="mono">{scene.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
