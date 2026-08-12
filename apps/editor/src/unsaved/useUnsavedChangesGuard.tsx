import { useCallback, useRef, useState, type ReactNode } from "react";
import { hasUnsavedChanges } from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import {
  UnsavedChangesDialog,
  type UnsavedChangesChoice,
} from "./UnsavedChangesDialog";

type UnsavedPrompt = {
  resolve: (choice: UnsavedChangesChoice) => void;
};

/**
 * Shared Save / Don't Save / Cancel prompt for leaving a dirty scene.
 * Use before loadScene, createScene, or any other document switch.
 */
export function useUnsavedChangesGuard(): {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  isBlocked: boolean;
  confirmUnsavedIfNeeded: () => Promise<UnsavedChangesChoice>;
  runGuarded: (action: () => Promise<void>) => Promise<boolean>;
  dialog: ReactNode;
} {
  const editor = useEditor();
  const sceneName = useEditorState((ed) => ed.getScene().name);
  const [busy, setBusy] = useState(false);
  const [unsavedPrompt, setUnsavedPrompt] = useState<UnsavedPrompt | null>(
    null,
  );
  const unsavedPromptRef = useRef<UnsavedPrompt | null>(null);
  unsavedPromptRef.current = unsavedPrompt;

  const confirmUnsavedIfNeeded =
    useCallback((): Promise<UnsavedChangesChoice> => {
      if (!hasUnsavedChanges(editor.getDirtyState())) {
        return Promise.resolve("discard");
      }
      return new Promise((resolve) => {
        const prompt = { resolve };
        unsavedPromptRef.current = prompt;
        setUnsavedPrompt(prompt);
      });
    }, [editor]);

  const handleUnsavedChoice = useCallback((choice: UnsavedChangesChoice) => {
    const prompt = unsavedPromptRef.current;
    unsavedPromptRef.current = null;
    setUnsavedPrompt(null);
    prompt?.resolve(choice);
  }, []);

  const isBlocked =
    busy || unsavedPrompt !== null || editor.getDirtyState() === "saving";

  /**
   * Prompts when dirty; on Save persists first, then runs `action`.
   * Returns false if cancelled or blocked.
   */
  const runGuarded = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (isBlocked) {
        return false;
      }
      const choice = await confirmUnsavedIfNeeded();
      if (choice === "cancel") {
        return false;
      }
      setBusy(true);
      try {
        if (choice === "save") {
          await editor.saveScene();
        }
        await action();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [confirmUnsavedIfNeeded, editor, isBlocked],
  );

  const dialog = (
    <UnsavedChangesDialog
      open={unsavedPrompt !== null}
      sceneName={sceneName}
      busy={busy}
      onChoice={handleUnsavedChoice}
    />
  );

  return {
    busy,
    setBusy,
    isBlocked,
    confirmUnsavedIfNeeded,
    runGuarded,
    dialog,
  };
}
