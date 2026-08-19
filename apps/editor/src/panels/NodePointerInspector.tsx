import type { Editor } from "@game-editor/editor-core";
import {
  getNodeCursor,
  getNodePointerChildren,
  getNodePointerEventMode,
  getTransform2D,
  NODE_CURSOR_PRESETS,
  NODE_POINTER_EVENT_MODES,
  type NodePointerEventMode,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  BooleanField,
  EnumField,
} from "./fields/inspector-fields";

const EVENT_MODE_LABELS: Record<NodePointerEventMode, string> = {
  none: "None — ignore this node and children",
  passive: "Passive — children only",
  auto: "Auto — only if it has listeners",
  static: "Static — receive events (default)",
  dynamic: "Dynamic — receive events (moving)",
};

const CURSOR_LABELS: Record<string, string> = {
  "": "(default)",
  default: "default",
  pointer: "pointer",
  grab: "grab",
  grabbing: "grabbing",
  move: "move",
  crosshair: "crosshair",
  text: "text",
  wait: "wait",
  help: "help",
  "not-allowed": "not-allowed",
  none: "none (hidden)",
};

interface Props {
  editor: Editor;
  node: SceneNodeData;
}

export function NodePointerInspector({ editor, node }: Props) {
  if (!getTransform2D(node)) {
    return null;
  }
  const cursor = getNodeCursor(node);
  const cursorOptions: readonly string[] = (
    NODE_CURSOR_PRESETS as readonly string[]
  ).includes(cursor)
    ? NODE_CURSOR_PRESETS
    : [...NODE_CURSOR_PRESETS, cursor];

  return (
    <section className="inspector-section">
      <h3>Pointer</h3>
      <p className="panel-hint">
        Playback and game runtime only. Editor selection still uses grab.
      </p>
      <div className="inspector-grid">
        <EnumField
          label="Event mode"
          value={getNodePointerEventMode(node)}
          options={NODE_POINTER_EVENT_MODES}
          optionLabels={EVENT_MODE_LABELS}
          onCommit={(eventMode) =>
            editor.setNodePointer(node.id, { eventMode })
          }
        />
        <EnumField
          label="Cursor"
          value={cursor}
          options={cursorOptions}
          optionLabels={CURSOR_LABELS}
          onCommit={(next) => editor.setNodePointer(node.id, { cursor: next })}
        />
        <BooleanField
          label="Children receive pointer events"
          value={getNodePointerChildren(node)}
          onCommit={(children) => editor.setNodePointer(node.id, { children })}
        />
      </div>
    </section>
  );
}
