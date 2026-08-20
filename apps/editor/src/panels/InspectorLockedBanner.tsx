import type { Editor, EditorNodeFlags } from "@game-editor/editor-core";
import type { SceneNodeData } from "@game-editor/scene";

interface Props {
  editor: Editor;
  node: SceneNodeData;
  flags: EditorNodeFlags;
}

export function InspectorLockedBanner({ editor, node, flags }: Props) {
  if (!flags.effectivelyLocked) {
    return null;
  }
  return (
    <div className="inspector-locked-banner">
      <p>
        {flags.lockedByAncestorName
          ? `Locked because parent "${flags.lockedByAncestorName}" is locked`
          : "This node is locked in the editor"}
      </p>
      <button type="button" onClick={() => editor.unlockNodeForEditing(node.id)}>
        Unlock
      </button>
    </div>
  );
}
