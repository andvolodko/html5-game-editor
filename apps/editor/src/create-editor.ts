import {
  createFetchAssetApiClient,
  createFetchComponentCatalogApiClient,
  createFetchProjectApiClient,
  createFetchPrefabApiClient,
  createFetchSceneApiClient,
  Editor,
} from "@game-editor/editor-core";

const PROJECT_SERVER_API_BASE = "/api";

/**
 * Live `pnpm dev` factory: project-server over the Vite `/api` proxy.
 * Demo mode replaces this module via vite plugin so eager game JSON globs
 * never enter the live module graph (Ctrl+S would otherwise full-reload).
 */
export function createEditor(): Editor {
  return new Editor({
    sceneApi: createFetchSceneApiClient(PROJECT_SERVER_API_BASE),
    assetApi: createFetchAssetApiClient(PROJECT_SERVER_API_BASE),
    projectApi: createFetchProjectApiClient(PROJECT_SERVER_API_BASE),
    componentCatalogApi: createFetchComponentCatalogApiClient(
      PROJECT_SERVER_API_BASE,
    ),
    prefabApi: createFetchPrefabApiClient(PROJECT_SERVER_API_BASE),
  });
}
