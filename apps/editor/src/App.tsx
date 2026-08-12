import { useEffect, useMemo } from "react";
import {
  createFetchAssetApiClient,
  createFetchComponentCatalogApiClient,
  createFetchProjectApiClient,
  createFetchSceneApiClient,
  Editor,
} from "@game-editor/editor-core";
import { EditorShell } from "./layout/EditorShell";
import { EditorContext } from "./editor-context";
import { syncEditorComponentCatalog } from "./components/sync-editor-component-catalog";

export function App() {
  const editor = useMemo(
    () =>
      new Editor({
        sceneApi: createFetchSceneApiClient("/api"),
        assetApi: createFetchAssetApiClient("/api"),
        projectApi: createFetchProjectApiClient("/api"),
        componentCatalogApi: createFetchComponentCatalogApiClient("/api"),
      }),
    [],
  );

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
