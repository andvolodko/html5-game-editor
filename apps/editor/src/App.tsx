import { useEffect, useMemo } from "react";
import { EditorShell } from "./layout/EditorShell";
import { EditorContext } from "./editor-context";
import { syncEditorComponentCatalog } from "./components/sync-editor-component-catalog";
import { createEditor } from "./create-editor";

export function App() {
  const editor = useMemo(() => createEditor(), []);

  // Load project manifest, assets, start scene, and script component catalog.
  useEffect(() => {
    void editor
      .bootstrapActiveProject()
      .then(() => syncEditorComponentCatalog(editor))
      .catch(() => {
        // Errors surface via ProjectManager / AssetManager status.
      });
  }, [editor]);

  return (
    <EditorContext.Provider value={editor}>
      <EditorShell />
    </EditorContext.Provider>
  );
}
