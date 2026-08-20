import type { Dispatch, SetStateAction } from "react";
import type { Editor } from "@game-editor/editor-core";
import {
  BASE_NODE_STATE_ID,
  getNodeLayer,
  type NodeStateId,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";
import { InspectorFieldRow } from "./fields/inspector-fields";
import { isInspectorPropertyOverridden } from "./prefab-override-flag";
import {
  isInspectorStatePropertyOverridden,
  transformDraftKeyToStatePath,
  type Transform2DDraftKey,
} from "./inspector-node-state";
import {
  transform2DOverridePath,
  type Transform2DCommitTarget,
  type TransformDraft,
} from "./inspector-transform-commit";

const TRANSFORM_2D_FIELD_ROWS = [
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
] as const;

interface Props {
  editor: Editor;
  scene: SceneData;
  node: SceneNodeData;
  activeStateId: NodeStateId | typeof BASE_NODE_STATE_ID;
  transform: Transform2DCommitTarget["transform"];
  effectiveTransform2D: Transform2DCommitTarget["effectiveTransform2D"] | undefined;
  draft: TransformDraft | null;
  setDraft: Dispatch<SetStateAction<TransformDraft | null>>;
  supportsAnchor: boolean;
  commitTransform: () => void;
  commitAnchor: () => void;
}

export function Transform2DInspector({
  editor,
  scene,
  node,
  activeStateId,
  transform,
  effectiveTransform2D,
  draft,
  setDraft,
  supportsAnchor,
  commitTransform,
  commitAnchor,
}: Props) {
  const setFlip = (axis: "x" | "y", flipped: boolean) => {
    if (!effectiveTransform2D) {
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
    editor.setTransform2D(node.id, { scale });
  };

  return (
    <>
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

      {effectiveTransform2D && draft ? (
        <section className="inspector-section">
          <h3>Transform2D</h3>
          <div className="inspector-grid">
            {TRANSFORM_2D_FIELD_ROWS.map((row) => (
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
    </>
  );
}
