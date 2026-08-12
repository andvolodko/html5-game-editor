import { useMemo } from "react";
import { Editor } from "@game-editor/editor-core";
import { EditorShell } from "./layout/EditorShell";
import { EditorContext } from "./editor-context";

export function App() {
  const editor = useMemo(() => new Editor(), []);

  return (
    <EditorContext.Provider value={editor}>
      <EditorShell />
    </EditorContext.Provider>
  );
}
