import type { Editor } from "@game-editor/editor-core";
import {
  BASE_NODE_STATE_ID,
  type NodeStateId,
  type SceneNodeData,
} from "@game-editor/scene";
import { BooleanField, InspectorFieldRow, NumberField } from "./fields/inspector-fields";
import {
  getInspectorEffectiveAlpha,
  getInspectorEffectiveVisible,
  isInspectorStatePropertyOverridden,
} from "./inspector-node-state";

interface Props {
  editor: Editor;
  node: SceneNodeData;
  activeStateId: NodeStateId | typeof BASE_NODE_STATE_ID;
}

export function NodeInspectorSection({ editor, node, activeStateId }: Props) {
  return (
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
  );
}
