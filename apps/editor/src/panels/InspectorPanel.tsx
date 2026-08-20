import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CompositeCommand } from "@game-editor/commands";
import type { Editor, Transform2DPatch, Transform3DPatch } from "@game-editor/editor-core";
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
  BASE_NODE_STATE_ID,
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
import { HitZoneInspector } from "./HitZoneInspector";
import { MaskInspector } from "./MaskInspector";
import { NodePointerInspector } from "./NodePointerInspector";
import { PrefabInspectorSection } from "./PrefabInspectorSection";
import { isInspectorPropertyOverridden } from "./prefab-override-flag";
import {
  getInspectorEffectiveAlpha,
  getInspectorEffectiveTransform2D,
  getInspectorEffectiveVisible,
  isInspectorStatePropertyOverridden,
  transformDraftKeyToStatePath,
  type Transform2DDraftKey,
} from "./inspector-node-state";
import { BooleanField, InspectorFieldRow, NumberField } from "./fields/inspector-fields";
import {
  formatInspectorNumber,
  resolveInspectorNumber,
} from "./fields/format-inspector-number";

interface TransformDraft {
  x: string;
  y: string;
  rotation: string;
  scaleX: string;
  scaleY: string;
  skewX: string;
  skewY: string;
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

function createTransform2DDraft(
  transform: { skew?: { x: number; y: number } },
  effectiveTransform2D: {
    position: { x: number; y: number };
    rotation: number;
    scale: { x: number; y: number };
  },
  visualAnchor: { x: number; y: number } | undefined,
): TransformDraft {
  const skew = transform.skew ?? { x: 0, y: 0 };
  const anchor = visualAnchor ?? { x: 0.5, y: 0.5 };
  return {
    x: formatInspectorNumber(effectiveTransform2D.position.x),
    y: formatInspectorNumber(effectiveTransform2D.position.y),
    rotation: formatInspectorNumber(effectiveTransform2D.rotation),
    scaleX: formatInspectorNumber(effectiveTransform2D.scale.x),
    scaleY: formatInspectorNumber(effectiveTransform2D.scale.y),
    skewX: formatInspectorNumber(skew.x),
    skewY: formatInspectorNumber(skew.y),
    anchorX: formatInspectorNumber(anchor.x),
    anchorY: formatInspectorNumber(anchor.y),
  };
}

function createTransform3DDraft(transform3D: {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}): Transform3DDraft {
  return {
    x: formatInspectorNumber(transform3D.position.x),
    y: formatInspectorNumber(transform3D.position.y),
    z: formatInspectorNumber(transform3D.position.z),
    rotX: formatInspectorNumber(transform3D.rotation.x),
    rotY: formatInspectorNumber(transform3D.rotation.y),
    rotZ: formatInspectorNumber(transform3D.rotation.z),
    scaleX: formatInspectorNumber(transform3D.scale.x),
    scaleY: formatInspectorNumber(transform3D.scale.y),
    scaleZ: formatInspectorNumber(transform3D.scale.z),
  };
}

function createSpriteSizeDraft(sprite: { width: number; height: number }): SpriteSizeDraft {
  return {
    width: formatInspectorNumber(sprite.width),
    height: formatInspectorNumber(sprite.height),
  };
}

type Transform2DCommitTarget = {
  nodeId: string;
  transform: NonNullable<ReturnType<typeof getTransform2D>>;
  effectiveTransform2D: NonNullable<
    ReturnType<typeof getInspectorEffectiveTransform2D>
  >;
  visual: ReturnType<typeof getVisualComponent>;
  sprite: ReturnType<typeof getSprite>;
  supportsAnchor: boolean;
};

type Transform3DCommitTarget = {
  nodeId: string;
  transform3D: NonNullable<ReturnType<typeof getTransform3D>>;
};

type SizeCommitTarget = {
  nodeId: string;
  sprite: NonNullable<ReturnType<typeof getSprite>>;
};

function commitBoundTransform2D(
  editor: Editor,
  target: Transform2DCommitTarget,
  draft: TransformDraft,
): void {
  const { nodeId, transform: boundTransform, effectiveTransform2D: boundPose } =
    target;
  const x = resolveInspectorNumber(draft.x, boundPose.position.x);
  const y = resolveInspectorNumber(draft.y, boundPose.position.y);
  const rotation = resolveInspectorNumber(draft.rotation, boundPose.rotation);
  const scaleX = resolveInspectorNumber(draft.scaleX, boundPose.scale.x);
  const scaleY = resolveInspectorNumber(draft.scaleY, boundPose.scale.y);
  const currentSkew = boundTransform.skew ?? { x: 0, y: 0 };
  const skewX = resolveInspectorNumber(draft.skewX, currentSkew.x);
  const skewY = resolveInspectorNumber(draft.skewY, currentSkew.y);
  if (
    x === undefined ||
    y === undefined ||
    rotation === undefined ||
    scaleX === undefined ||
    scaleY === undefined ||
    skewX === undefined ||
    skewY === undefined
  ) {
    return;
  }
  const unchanged =
    x === boundPose.position.x &&
    y === boundPose.position.y &&
    rotation === boundPose.rotation &&
    scaleX === boundPose.scale.x &&
    scaleY === boundPose.scale.y &&
    skewX === currentSkew.x &&
    skewY === currentSkew.y;
  if (unchanged) {
    return;
  }
  const patch: Transform2DPatch = {
    position: { x, y },
    rotation,
    scale: { x: scaleX, y: scaleY },
    skew: { x: skewX, y: skewY },
  };
  editor.setTransform2D(nodeId, patch);
}

function commitBoundAnchor(
  editor: Editor,
  target: Transform2DCommitTarget,
  draft: TransformDraft,
): void {
  if (!target.visual || !target.supportsAnchor) {
    return;
  }
  const { nodeId, visual: boundVisual, sprite: boundSprite, transform: boundTransform } =
    target;
  const current = getVisualAnchorOrDefault(boundVisual);
  const x = resolveInspectorNumber(draft.anchorX, current.x);
  const y = resolveInspectorNumber(draft.anchorY, current.y);
  if (x === undefined || y === undefined) {
    return;
  }
  if (x === current.x && y === current.y) {
    return;
  }
  const nextAnchor = { x, y };
  if (boundSprite && boundTransform) {
    const delta = positionDeltaForAnchorChange(
      current,
      nextAnchor,
      boundSprite.width,
      boundSprite.height,
      boundTransform.rotation,
      boundTransform.scale,
    );
    editor.execute(
      new CompositeCommand("SetVisualAnchor", [
        new SetVisualComponentCommand(editor.document, nodeId, {
          anchor: nextAnchor,
        }),
        new SetTransform2DCommand(editor.document, nodeId, {
          position: {
            x: boundTransform.position.x + delta.x,
            y: boundTransform.position.y + delta.y,
          },
        }),
      ]),
    );
    return;
  }
  editor.setVisualComponent(nodeId, { anchor: nextAnchor });
}

function commitBoundTransform3D(
  editor: Editor,
  target: Transform3DCommitTarget,
  draft: Transform3DDraft,
): void {
  const { nodeId, transform3D: boundTransform3D } = target;
  const x = resolveInspectorNumber(draft.x, boundTransform3D.position.x);
  const y = resolveInspectorNumber(draft.y, boundTransform3D.position.y);
  const z = resolveInspectorNumber(draft.z, boundTransform3D.position.z);
  const rotX = resolveInspectorNumber(draft.rotX, boundTransform3D.rotation.x);
  const rotY = resolveInspectorNumber(draft.rotY, boundTransform3D.rotation.y);
  const rotZ = resolveInspectorNumber(draft.rotZ, boundTransform3D.rotation.z);
  const scaleX = resolveInspectorNumber(draft.scaleX, boundTransform3D.scale.x);
  const scaleY = resolveInspectorNumber(draft.scaleY, boundTransform3D.scale.y);
  const scaleZ = resolveInspectorNumber(draft.scaleZ, boundTransform3D.scale.z);
  if (
    x === undefined ||
    y === undefined ||
    z === undefined ||
    rotX === undefined ||
    rotY === undefined ||
    rotZ === undefined ||
    scaleX === undefined ||
    scaleY === undefined ||
    scaleZ === undefined
  ) {
    return;
  }
  const unchanged =
    x === boundTransform3D.position.x &&
    y === boundTransform3D.position.y &&
    z === boundTransform3D.position.z &&
    rotX === boundTransform3D.rotation.x &&
    rotY === boundTransform3D.rotation.y &&
    rotZ === boundTransform3D.rotation.z &&
    scaleX === boundTransform3D.scale.x &&
    scaleY === boundTransform3D.scale.y &&
    scaleZ === boundTransform3D.scale.z;
  if (unchanged) {
    return;
  }
  const patch: Transform3DPatch = {
    position: { x, y, z },
    rotation: { x: rotX, y: rotY, z: rotZ },
    scale: { x: scaleX, y: scaleY, z: scaleZ },
  };
  editor.setTransform3D(nodeId, patch);
}

function commitBoundSpriteSize(
  editor: Editor,
  target: SizeCommitTarget,
  draft: SpriteSizeDraft,
): void {
  const { nodeId, sprite: boundSprite } = target;
  const width = resolveInspectorNumber(draft.width, boundSprite.width);
  const height = resolveInspectorNumber(draft.height, boundSprite.height);
  if (
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return;
  }
  if (width === boundSprite.width && height === boundSprite.height) {
    return;
  }
  editor.setSpriteSize(nodeId, { width, height });
}

export function InspectorPanel() {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const sceneSelected = useEditorState((ed) => ed.selection.isSceneSelected());
  const selectedId = useEditorState((ed) => ed.selection.getPrimaryNodeId());
  const activeStateId = useEditorState((ed) =>
    ed.nodeStates.getActiveStateId(),
  );
  const node =
    !sceneSelected && selectedId
      ? findNodeById(scene, selectedId)
      : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  const effectiveTransform2D = node
    ? getInspectorEffectiveTransform2D(node, activeStateId)
    : undefined;
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
  const inspectorIdentity = `${selectedId ?? ""}:${activeStateId}`;
  const inspectorIdentityRef = useRef(inspectorIdentity);
  const ignoreStaleInspectorBlurRef = useRef(false);
  const draftRef = useRef(draft);
  const draft3DRef = useRef(draft3D);
  const sizeDraftRef = useRef(sizeDraft);
  draftRef.current = draft;
  draft3DRef.current = draft3D;
  sizeDraftRef.current = sizeDraft;
  const transformCommitRef = useRef<Transform2DCommitTarget | null>(null);
  const transform3DCommitRef = useRef<Transform3DCommitTarget | null>(null);
  const sizeCommitRef = useRef<SizeCommitTarget | null>(null);

  useEffect(() => {
    setSceneNameDraft(scene.name);
  }, [scene.id, scene.name, sceneSelected]);

  useLayoutEffect(() => {
    if (inspectorIdentityRef.current !== inspectorIdentity) {
      const transformTarget = transformCommitRef.current;
      const transformDraft = draftRef.current;
      if (transformTarget && transformDraft) {
        commitBoundTransform2D(editor, transformTarget, transformDraft);
        commitBoundAnchor(editor, transformTarget, transformDraft);
      }
      const transform3DTarget = transform3DCommitRef.current;
      const transform3DDraft = draft3DRef.current;
      if (transform3DTarget && transform3DDraft) {
        commitBoundTransform3D(editor, transform3DTarget, transform3DDraft);
      }
      const sizeTarget = sizeCommitRef.current;
      const spriteSizeDraft = sizeDraftRef.current;
      if (sizeTarget && spriteSizeDraft) {
        commitBoundSpriteSize(editor, sizeTarget, spriteSizeDraft);
      }
      ignoreStaleInspectorBlurRef.current = true;
      inspectorIdentityRef.current = inspectorIdentity;
    }

    if (!node || !transform || !effectiveTransform2D) {
      transformCommitRef.current = null;
      setDraft(null);
    } else {
      transformCommitRef.current = {
        nodeId: node.id,
        transform,
        effectiveTransform2D,
        visual,
        sprite,
        supportsAnchor,
      };
      setDraft(
        createTransform2DDraft(transform, effectiveTransform2D, visualAnchor),
      );
    }

    if (!node || !transform3D) {
      transform3DCommitRef.current = null;
      setDraft3D(null);
    } else {
      transform3DCommitRef.current = { nodeId: node.id, transform3D };
      setDraft3D(createTransform3DDraft(transform3D));
    }

    if (!node || !sprite) {
      sizeCommitRef.current = null;
      setSizeDraft(null);
    } else {
      sizeCommitRef.current = { nodeId: node.id, sprite };
      setSizeDraft(createSpriteSizeDraft(sprite));
    }
  }, [
    inspectorIdentity,
    supportsAnchor,
    effectiveTransform2D?.position.x,
    effectiveTransform2D?.position.y,
    effectiveTransform2D?.rotation,
    effectiveTransform2D?.scale.x,
    effectiveTransform2D?.scale.y,
    transform?.skew?.x,
    transform?.skew?.y,
    visualAnchor?.x,
    visualAnchor?.y,
    sprite?.width,
    sprite?.height,
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
    ignoreStaleInspectorBlurRef.current = false;
  });

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

  if (!node) {
    return (
      <div className="panel panel-inspector">
        <p className="panel-hint">Inspector</p>
        <p className="panel-empty">Select a node</p>
      </div>
    );
  }

  const commitTransform = () => {
    if (ignoreStaleInspectorBlurRef.current) {
      return;
    }
    const target = transformCommitRef.current;
    const currentDraft = draftRef.current;
    if (!target || !currentDraft) {
      return;
    }
    commitBoundTransform2D(editor, target, currentDraft);
  };

  const commitAnchor = () => {
    if (ignoreStaleInspectorBlurRef.current) {
      return;
    }
    const target = transformCommitRef.current;
    const currentDraft = draftRef.current;
    if (!target || !currentDraft) {
      return;
    }
    commitBoundAnchor(editor, target, currentDraft);
  };

  const setFlip = (axis: "x" | "y", flipped: boolean) => {
    if (!transform || !effectiveTransform2D) {
      return;
    }
    const current =
      axis === "x"
        ? effectiveTransform2D.scale.x
        : effectiveTransform2D.scale.y;
    const magnitude = Math.abs(current) || 1;
    const nextSigned = flipped ? -magnitude : magnitude;
    if (nextSigned === current) {
      return;
    }
    const scale =
      axis === "x"
        ? { x: nextSigned, y: effectiveTransform2D.scale.y }
        : { x: effectiveTransform2D.scale.x, y: nextSigned };
    editor.setTransform2D(node!.id, { scale });
  };

  const commitSize = () => {
    if (ignoreStaleInspectorBlurRef.current) {
      return;
    }
    const target = sizeCommitRef.current;
    const currentDraft = sizeDraftRef.current;
    if (!target || !currentDraft) {
      return;
    }
    commitBoundSpriteSize(editor, target, currentDraft);
  };

  const commitTransform3D = () => {
    if (ignoreStaleInspectorBlurRef.current) {
      return;
    }
    const target = transform3DCommitRef.current;
    const currentDraft = draft3DRef.current;
    if (!target || !currentDraft) {
      return;
    }
    commitBoundTransform3D(editor, target, currentDraft);
  };

  const editorFlags = editor.getEditorNodeFlags(node.id);
  const inspectorLocked = editorFlags.effectivelyLocked;

  return (
    <div className="panel panel-inspector">
      <p className="panel-hint">Inspector · {node.name}</p>
      {inspectorLocked ? (
        <div className="inspector-locked-banner">
          <p>
            {editorFlags.lockedByAncestorName
              ? `Locked because parent "${editorFlags.lockedByAncestorName}" is locked`
              : "This node is locked in the editor"}
          </p>
          <button
            type="button"
            onClick={() => editor.unlockNodeForEditing(node.id)}
          >
            Unlock
          </button>
        </div>
      ) : null}
      <fieldset
        className="inspector-edit-fieldset"
        disabled={inspectorLocked}
      >
      <PrefabInspectorSection node={node} />

      <section className="inspector-section">
        <h3>Node</h3>
        <div className="inspector-grid">
          <InspectorFieldRow>
            <BooleanField
              label="Visible"
              value={getInspectorEffectiveVisible(node, activeStateId)}
              overridden={isInspectorStatePropertyOverridden(
                node,
                activeStateId,
                "visible",
              )}
              onResetOverride={
                activeStateId !== BASE_NODE_STATE_ID
                  ? () => editor.resetNodeStateProperty(node.id, "visible")
                  : undefined
              }
              onCommit={(visible) => editor.setNodeVisible(node.id, visible)}
            />
            <NumberField
              label="Alpha"
              value={getInspectorEffectiveAlpha(node, activeStateId)}
              overridden={isInspectorStatePropertyOverridden(
                node,
                activeStateId,
                "alpha",
              )}
              onResetOverride={
                activeStateId !== BASE_NODE_STATE_ID
                  ? () => editor.resetNodeStateProperty(node.id, "alpha")
                  : undefined
              }
              onCommit={(alpha) => editor.setNodeAlpha(node.id, alpha)}
            />
          </InspectorFieldRow>
        </div>
      </section>

      <NodePointerInspector editor={editor} node={node} />

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

      {transform && effectiveTransform2D && draft ? (
        <section className="inspector-section">
          <h3>Transform2D</h3>
          <div className="inspector-grid">
            {(
              [
                [
                  ["Position X", "x"],
                  ["Position Y", "y"],
                ],
                [["Rotation", "rotation"]],
                [
                  ["Scale X", "scaleX"],
                  ["Scale Y", "scaleY"],
                ],
                [
                  ["Skew X (°)", "skewX"],
                  ["Skew Y (°)", "skewY"],
                ],
              ] as const
            ).map((row) => (
              <InspectorFieldRow key={row.map(([, key]) => key).join("-")}>
                {row.map(([label, key]) => {
                  const isStatePath =
                    key === "x" ||
                    key === "y" ||
                    key === "rotation" ||
                    key === "scaleX" ||
                    key === "scaleY";
                  const stateOverridden =
                    isStatePath &&
                    isInspectorStatePropertyOverridden(
                      node,
                      activeStateId,
                      transformDraftKeyToStatePath(key as Transform2DDraftKey),
                    );
                  const prefabOverridden =
                    activeStateId === BASE_NODE_STATE_ID &&
                    isInspectorPropertyOverridden(
                      scene,
                      node,
                      transform.id,
                      transform2DOverridePath(key),
                    );
                  const overridden = stateOverridden || prefabOverridden;
                  return (
                    <label
                      key={key}
                      className={
                        overridden ? "inspector-field-overridden" : undefined
                      }
                    >
                      <span className="inspector-field-label-row">
                        {label}
                        {stateOverridden ? (
                          <button
                            type="button"
                            className="inspector-reset-override"
                            title="Reset to Base"
                            onClick={() =>
                              editor.resetNodeStateProperty(
                                node.id,
                                transformDraftKeyToStatePath(
                                  key as Transform2DDraftKey,
                                ),
                              )
                            }
                          >
                            ↺
                          </button>
                        ) : null}
                      </span>
                      <input
                        value={draft[key]}
                        onChange={(event) => {
                          setDraft((current) =>
                            current
                              ? { ...current, [key]: event.target.value }
                              : current,
                          );
                        }}
                        onBlur={commitTransform}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitTransform();
                          }
                        }}
                      />
                    </label>
                  );
                })}
              </InspectorFieldRow>
            ))}
            {supportsAnchor ? (
              <InspectorFieldRow>
                <label>
                  Anchor X
                  <input
                    value={draft.anchorX}
                    onChange={(event) => {
                      setDraft((current) =>
                        current
                          ? { ...current, anchorX: event.target.value }
                          : current,
                      );
                    }}
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
                    onChange={(event) => {
                      setDraft((current) =>
                        current
                          ? { ...current, anchorY: event.target.value }
                          : current,
                      );
                    }}
                    onBlur={commitAnchor}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitAnchor();
                      }
                    }}
                  />
                </label>
              </InspectorFieldRow>
            ) : null}
            <InspectorFieldRow>
              <label className="inspector-checkbox">
                Flip Horizontal
                <input
                  type="checkbox"
                  checked={effectiveTransform2D.scale.x < 0}
                  onChange={(event) => setFlip("x", event.target.checked)}
                />
              </label>
              <label className="inspector-checkbox">
                Flip Vertical
                <input
                  type="checkbox"
                  checked={effectiveTransform2D.scale.y < 0}
                  onChange={(event) => setFlip("y", event.target.checked)}
                />
              </label>
            </InspectorFieldRow>
          </div>
        </section>
      ) : null}

      {transform3D && draft3D ? (
        <section className="inspector-section">
          <h3>Transform3D</h3>
          <div className="inspector-grid">
            {(
              [
                [
                  ["Pos X", "x"],
                  ["Pos Y", "y"],
                  ["Pos Z", "z"],
                ],
                [
                  ["Rot X", "rotX"],
                  ["Rot Y", "rotY"],
                  ["Rot Z", "rotZ"],
                ],
                [
                  ["Scale X", "scaleX"],
                  ["Scale Y", "scaleY"],
                  ["Scale Z", "scaleZ"],
                ],
              ] as const
            ).map((row) => (
              <InspectorFieldRow key={row.map(([, key]) => key).join("-")}>
                {row.map(([label, key]) => (
                  <label key={key}>
                    {label}
                    <input
                      value={draft3D[key]}
                      onChange={(event) => {
                        setDraft3D((current) =>
                          current
                            ? { ...current, [key]: event.target.value }
                            : current,
                        );
                      }}
                      onBlur={commitTransform3D}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitTransform3D();
                        }
                      }}
                    />
                  </label>
                ))}
              </InspectorFieldRow>
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
            <InspectorFieldRow>
              <label>
                Width
                <input
                  value={sizeDraft.width}
                  onChange={(event) => {
                    setSizeDraft((current) =>
                      current
                        ? { ...current, width: event.target.value }
                        : current,
                    );
                  }}
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
                  onChange={(event) => {
                    setSizeDraft((current) =>
                      current
                        ? { ...current, height: event.target.value }
                        : current,
                    );
                  }}
                  onBlur={commitSize}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitSize();
                    }
                  }}
                />
              </label>
            </InspectorFieldRow>
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

      <HitZoneInspector editor={editor} scene={scene} node={node} />
      <MaskInspector editor={editor} scene={scene} node={node} />
      <ScriptComponentsInspector node={node} />
      </fieldset>
    </div>
  );
}

function transform2DOverridePath(
  key: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "skewX" | "skewY",
): string {
  if (key === "x" || key === "y") {
    return `position.${key}`;
  }
  if (key === "scaleX") {
    return "scale.x";
  }
  if (key === "scaleY") {
    return "scale.y";
  }
  if (key === "skewX") {
    return "skew.x";
  }
  if (key === "skewY") {
    return "skew.y";
  }
  return "rotation";
}
