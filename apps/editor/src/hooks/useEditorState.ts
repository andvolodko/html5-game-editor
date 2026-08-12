import { useSyncExternalStore } from "react";
import type { Editor } from "@game-editor/editor-core";
import { useEditor } from "../editor-context";

function subscribeEditor(editor: Editor, onStoreChange: () => void): () => void {
  return editor.subscribe(onStoreChange);
}

/**
 * Re-render when any editor façade notification fires (document, selection,
 * assets, dirty/save state, etc.). Snapshot uses `getStoreVersion()` so asset
 * catalogue loads invalidate views even when the scene document is unchanged.
 */
export function useEditorState<T>(selector: (editor: Editor) => T): T {
  const editor = useEditor();
  const version = useSyncExternalStore(
    (onStoreChange) => subscribeEditor(editor, onStoreChange),
    () => editor.getStoreVersion(),
    () => editor.getStoreVersion(),
  );

  void version;
  return selector(editor);
}
