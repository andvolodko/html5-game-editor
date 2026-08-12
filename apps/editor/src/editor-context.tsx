import { createContext, useContext } from "react";
import type { Editor } from "@game-editor/editor-core";

export const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error("useEditor must be used within EditorContext.Provider");
  }
  return editor;
}
