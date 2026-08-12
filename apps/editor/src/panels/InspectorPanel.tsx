import { useEffect, useState } from "react";
import { CompositeCommand } from "@game-editor/commands";
import type { Transform2DPatch, Transform3DPatch } from "@game-editor/editor-core";
import {
  SetTransform2DCommand,
  SetVisualComponentCommand,
} from "@game-editor/editor-core";
import {
  findNodeById,
  getAmbientLight,
  getDirectionalLight,
  getModel3D,
  getNodeLayer,
  getPerspectiveCamera,
  getSceneRendererKind,
  getSprite,
  getTransform2D,
  getTransform3D,
  getVisualAnchorOrDefault,
  getVisualComponent,
  positionDeltaForAnchorChange,
  visualComponentSupportsAnchor,
} from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { VisualComponentInspector } from "./VisualComponentInspector";
import { Model3DInspector } from "./Model3DInspector";
import { PerspectiveCameraInspector } from "./PerspectiveCameraInspector";
import {
  AmbientLightInspector,
  DirectionalLightInspector,
} from "./ThreeLightInspector";
import { ScriptComponentsInspector } from "./ScriptComponentsInspector";

interface TransformDraft {
  x: string;
  y: string;
  rotation: string;
  scaleX: string;
  scaleY: string;
  anchorX: string;
  anchorY: string;
}

interface Transform3DDraft {
  x: string;
  y: string;
  z: string;
  rotX: string;
  rotY: string;
  rotZ: string;
  scaleX: string;
  scaleY: string;
  scaleZ: string;
}

interface SpriteSizeDraft {
  width: string;
  height: string;
}

export function InspectorPanel() {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const sceneSelected = useEditorState((ed) => ed.selection.isSceneSelected());
  const selectedId = useEditorState((ed) => ed.selection.getPrimaryNodeId());
  const node =
    !sceneSelected && selectedId
      ? findNodeById(scene, selectedId)
      : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  const transform3D = node ? getTransform3D(node) : undefined;
  const model3D = node ? getModel3D(node) : undefined;
  const perspectiveCamera = node ? getPerspectiveCamera(node) : undefined;
  const directionalLight = node ? getDirectionalLight(node) : undefined;
  const ambientLight = node ? getAmbientLight(node) : undefined;
  const sprite = node ? getSprite(node) : undefined;
  const visual = node ? getVisualComponent(node) : undefined;
  const supportsAnchor = visual
    ? visualComponentSupportsAnchor(visual)
    : false;
  const visualAnchor = visual ? getVisualAnchorOrDefault(visual) : undefined;
  const asset =
    sprite?.assetId !== undefined ? editor.assets.get(sprite.assetId) : undefined;
  const assetUrl =
    sprite?.assetId !== undefined
      ? editor.assets.getContentUrl(sprite.assetId)
      : undefined;

  const [draft, setDraft] = useState<TransformDraft | null>(null);
  const [draft3D, setDraft3D] = useState<Transform3DDraft | null>(null);
  const [sizeDraft, setSizeDraft] = useState<SpriteSizeDraft | null>(null);
  const [sceneNameDraft, setSceneNameDraft] = useState(scene.name);

  useEffect(() => {
    setSceneNameDraft(scene.name);
  }, [scene.id, scene.name, sceneSelected]);

  useEffect(() => {
    if (!transform) {
      setDraft(null);
      return;
    }
    const anchor = visualAnchor ?? { x: 0.5, y: 0.5 };
    setDraft({
      x: String(transform.position.x),
      y: String(transform.position.y),
      rotation: String(transform.rotation),
      scaleX: String(transform.scale.x),
      scaleY: String(transform.scale.y),
      anchorX: String(anchor.x),
      anchorY: String(anchor.y),
    });
  }, [
    selectedId,
    transform?.position.x,
    transform?.position.y,
    transform?.rotation,
    transform?.scale.x,
    transform?.scale.y,
    visualAnchor?.x,
    visualAnchor?.y,
  ]);

  useEffect(() => {
    if (!transform3D) {
      setDraft3D(null);
      return;
    }
    setDraft3D({
      x: String(transform3D.position.x),
      y: String(transform3D.position.y),
      z: String(transform3D.position.z),
      rotX: String(transform3D.rotation.x),
      rotY: String(transform3D.rotation.y),
      rotZ: String(transform3D.rotation.z),
      scaleX: String(transform3D.scale.x),
      scaleY: String(transform3D.scale.y),
      scaleZ: String(transform3D.scale.z),
    });
  }, [
    selectedId,
    transform3D?.position.x,
    transform3D?.position.y,
    transform3D?.position.z,
    transform3D?.rotation.x,
    transform3D?.rotation.y,
    transform3D?.rotation.z,
    transform3D?.scale.x,
    transform3D?.scale.y,
    transform3D?.scale.z,
  ]);

  useEffect(() => {
    if (!sprite) {
      setSizeDraft(null);
      return;
    }
    setSizeDraft({
      width: String(sprite.width),
      height: String(sprite.height),
    });
  }, [selectedId, sprite?.width, sprite?.height]);

  if (sceneSelected) {
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
      <div className="panel">
        <p className="panel-hint">Inspector · Scene</p>
        <section className="inspector-section">
          <h3>Scene</h3>
          <div className="inspector-grid">
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

  if (!node) {
    return (
      <div className="panel">
        <p className="panel-hint">Inspector</p>
        <p className="panel-empty">Select a node</p>
      </div>
    );
  }

  const commitTransform = () => {
    if (!transform || !draft) {
      return;
    }
    const position = { x: Number(draft.x), y: Number(draft.y) };
    const rotation = Number(draft.rotation);
    const scale = { x: Number(draft.scaleX), y: Number(draft.scaleY) };

    if (
      Number.isNaN(position.x) ||
      Number.isNaN(position.y) ||
      Number.isNaN(rotation) ||
      Number.isNaN(scale.x) ||
      Number.isNaN(scale.y)
    ) {
      return;
    }

    const unchanged =
      position.x === transform.position.x &&
      position.y === transform.position.y &&
      rotation === transform.rotation &&
      scale.x === transform.scale.x &&
      scale.y === transform.scale.y;

    if (unchanged) {
      return;
    }

    const patch: Transform2DPatch = { position, rotation, scale };
    editor.setTransform2D(node.id, patch);
  };

  const commitAnchor = () => {
    if (!node || !visual || !supportsAnchor || !draft) {
      return;
    }
    const x = Number(draft.anchorX);
    const y = Number(draft.anchorY);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return;
    }
    const current = getVisualAnchorOrDefault(visual);
    if (x === current.x && y === current.y) {
      return;
    }
    const nextAnchor = { x, y };
    // Keep the on-screen visual fixed when the pivot moves (same as gizmo drag).
    if (sprite && transform) {
      const delta = positionDeltaForAnchorChange(
        current,
        nextAnchor,
        sprite.width,
        sprite.height,
        transform.rotation,
        transform.scale,
      );
      editor.execute(
        new CompositeCommand("SetVisualAnchor", [
          new SetVisualComponentCommand(editor.document, node.id, {
            anchor: nextAnchor,
          }),
          new SetTransform2DCommand(editor.document, node.id, {
            position: {
              x: transform.position.x + delta.x,
              y: transform.position.y + delta.y,
            },
          }),
        ]),
      );
      return;
    }
    editor.setVisualComponent(node.id, { anchor: nextAnchor });
  };

  const setFlip = (axis: "x" | "y", flipped: boolean) => {
    if (!transform) {
      return;
    }
    const current = axis === "x" ? transform.scale.x : transform.scale.y;
    const magnitude = Math.abs(current) || 1;
    const nextSigned = flipped ? -magnitude : magnitude;
    if (nextSigned === current) {
      return;
    }
    const scale =
      axis === "x"
        ? { x: nextSigned, y: transform.scale.y }
        : { x: transform.scale.x, y: nextSigned };
    editor.setTransform2D(node.id, { scale });
  };

  const commitSize = () => {
    if (!sprite || !sizeDraft) {
      return;
    }
    const width = Number(sizeDraft.width);
    const height = Number(sizeDraft.height);
    if (
      Number.isNaN(width) ||
      Number.isNaN(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return;
    }
    if (width === sprite.width && height === sprite.height) {
      return;
    }
    editor.setSpriteSize(node.id, { width, height });
  };

  const commitTransform3D = () => {
    if (!transform3D || !draft3D) {
      return;
    }
    const position = {
      x: Number(draft3D.x),
      y: Number(draft3D.y),
      z: Number(draft3D.z),
    };
    const rotation = {
      x: Number(draft3D.rotX),
      y: Number(draft3D.rotY),
      z: Number(draft3D.rotZ),
    };
    const scale = {
      x: Number(draft3D.scaleX),
      y: Number(draft3D.scaleY),
      z: Number(draft3D.scaleZ),
    };
    if (
      [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, scale.x, scale.y, scale.z].some(
        (n) => Number.isNaN(n),
      )
    ) {
      return;
    }
    const unchanged =
      position.x === transform3D.position.x &&
      position.y === transform3D.position.y &&
      position.z === transform3D.position.z &&
      rotation.x === transform3D.rotation.x &&
      rotation.y === transform3D.rotation.y &&
      rotation.z === transform3D.rotation.z &&
      scale.x === transform3D.scale.x &&
      scale.y === transform3D.scale.y &&
      scale.z === transform3D.scale.z;
    if (unchanged) {
      return;
    }
    const patch: Transform3DPatch = { position, rotation, scale };
    editor.setTransform3D(node.id, patch);
  };

  return (
    <div className="panel">
      <p className="panel-hint">Inspector · {node.name}</p>

      {transform ? (
        <section className="inspector-section">
          <h3>2D Layer</h3>
          <div className="inspector-grid">
            <label>
              Hybrid stack
              <select
                value={getNodeLayer(node)}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === "background" || next === "foreground") {
                    editor.setNodeLayer(node.id, next);
                  }
                }}
              >
                <option value="background">Background (under Three)</option>
                <option value="foreground">Foreground (over Three)</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {transform && draft ? (
        <section className="inspector-section">
          <h3>Transform2D</h3>
          <div className="inspector-grid">
            {(
              [
                ["Position X", "x"],
                ["Position Y", "y"],
                ["Rotation", "rotation"],
                ["Scale X", "scaleX"],
                ["Scale Y", "scaleY"],
              ] as const
            ).map(([label, key]) => (
              <label key={key}>
                {label}
                <input
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                  onBlur={commitTransform}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitTransform();
                    }
                  }}
                />
              </label>
            ))}
            {supportsAnchor ? (
              <>
                <label>
                  Anchor X
                  <input
                    value={draft.anchorX}
                    onChange={(event) =>
                      setDraft({ ...draft, anchorX: event.target.value })
                    }
                    onBlur={commitAnchor}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitAnchor();
                      }
                    }}
                  />
                </label>
                <label>
                  Anchor Y
                  <input
                    value={draft.anchorY}
                    onChange={(event) =>
                      setDraft({ ...draft, anchorY: event.target.value })
                    }
                    onBlur={commitAnchor}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitAnchor();
                      }
                    }}
                  />
                </label>
              </>
            ) : null}
            <label className="inspector-checkbox">
              Flip Horizontal
              <input
                type="checkbox"
                checked={transform.scale.x < 0}
                onChange={(event) => setFlip("x", event.target.checked)}
              />
            </label>
            <label className="inspector-checkbox">
              Flip Vertical
              <input
                type="checkbox"
                checked={transform.scale.y < 0}
                onChange={(event) => setFlip("y", event.target.checked)}
              />
            </label>
          </div>
        </section>
      ) : null}

      {transform3D && draft3D ? (
        <section className="inspector-section">
          <h3>Transform3D</h3>
          <div className="inspector-grid">
            {(
              [
                ["Pos X", "x"],
                ["Pos Y", "y"],
                ["Pos Z", "z"],
                ["Rot X", "rotX"],
                ["Rot Y", "rotY"],
                ["Rot Z", "rotZ"],
                ["Scale X", "scaleX"],
                ["Scale Y", "scaleY"],
                ["Scale Z", "scaleZ"],
              ] as const
            ).map(([label, key]) => (
              <label key={key}>
                {label}
                <input
                  value={draft3D[key]}
                  onChange={(event) =>
                    setDraft3D({ ...draft3D, [key]: event.target.value })
                  }
                  onBlur={commitTransform3D}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitTransform3D();
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {model3D ? <Model3DInspector editor={editor} node={node} /> : null}
      {perspectiveCamera ? (
        <PerspectiveCameraInspector editor={editor} node={node} />
      ) : null}
      {directionalLight ? (
        <DirectionalLightInspector editor={editor} node={node} />
      ) : null}
      {ambientLight ? (
        <AmbientLightInspector editor={editor} node={node} />
      ) : null}

      {sprite && sizeDraft ? (
        <section className="inspector-section">
          <h3>Sprite</h3>
          {assetUrl ? (
            <img className="inspector-asset-thumb" src={assetUrl} alt={asset?.name ?? "asset"} />
          ) : (
            <p className="panel-error">
              Missing asset{sprite.assetId ? `: ${sprite.assetId}` : ""}
            </p>
          )}
          <div className="inspector-grid">
            <label>
              Width
              <input
                value={sizeDraft.width}
                onChange={(event) =>
                  setSizeDraft({ ...sizeDraft, width: event.target.value })
                }
                onBlur={commitSize}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitSize();
                  }
                }}
              />
            </label>
            <label>
              Height
              <input
                value={sizeDraft.height}
                onChange={(event) =>
                  setSizeDraft({ ...sizeDraft, height: event.target.value })
                }
                onBlur={commitSize}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitSize();
                  }
                }}
              />
            </label>
          </div>
          <dl className="inspector-meta">
            <div>
              <dt>Name</dt>
              <dd>{asset?.name ?? "—"}</dd>
            </div>
            <div>
              <dt>Asset ID</dt>
              <dd className="mono">{sprite.assetId ?? "—"}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <VisualComponentInspector editor={editor} node={node} />
      )}

      <ScriptComponentsInspector node={node} />
    </div>
  );
}
