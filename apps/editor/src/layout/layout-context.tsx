import { createContext, useContext } from "react";

export interface EditorLayoutControls {
  resetLayout: () => void;
}

export const EditorLayoutContext = createContext<EditorLayoutControls | null>(
  null,
);

export function useEditorLayoutControls(): EditorLayoutControls {
  const value = useContext(EditorLayoutContext);
  if (!value) {
    throw new Error("useEditorLayoutControls requires EditorLayoutContext");
  }
  return value;
}
