import { Editor } from "@game-editor/editor-core";
import { createDemoEditorClients } from "./create-demo-clients";
import {
  demoAssetBaseUrl,
  loadBundledDemoSnapshots,
  loadDemoComponentCatalogs,
} from "./load-demo-snapshot";

/** In-memory demo factory (`vite --mode demo`). Aliased over `create-editor.ts`. */
export function createEditor(): Editor {
  return new Editor(
    createDemoEditorClients(loadBundledDemoSnapshots(), {
      assetBaseUrl: demoAssetBaseUrl(),
      catalogs: loadDemoComponentCatalogs(),
      storage: window.localStorage,
    }),
  );
}
