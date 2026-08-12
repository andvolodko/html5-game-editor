import { useEffect, useMemo } from "react";
import {
  createFetchAssetApiClient,
  createFetchProjectApiClient,
  createFetchSceneApiClient,
  Editor,
} from "@game-editor/editor-core";
import { EditorShell } from "./layout/EditorShell";
import { EditorContext } from "./editor-context";

export function App() {
  const editor = useMemo(
    () =>
      new Editor({
        sceneApi: createFetchSceneApiClient("/api"),
        assetApi: createFetchAssetApiClient("/api"),
        projectApi: createFetchProjectApiClient("/api"),
      }),
    [],
  );

  // Load project manifest, assets, and start scene at startup.
  useEffect(() => {
    void editor.bootstrapActiveProject().catch(() => {
      // Errors surface via ProjectManager / AssetManager status.
    });
  }, [editor]);

  return (
    <EditorContext.Provider value={editor}>
      <EditorShell />
    </EditorContext.Provider>
  );
}
