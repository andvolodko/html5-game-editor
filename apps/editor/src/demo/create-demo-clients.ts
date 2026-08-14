import {
  AssetDatabase,
  computeAssetDatabaseRevision,
  createStaticAssetResolver,
} from "@game-editor/assets";
import { createEmptyScene } from "@game-editor/scene";
import type {
  AssetApiClient,
  ComponentCatalogApiClient,
  ProjectApiClient,
  SceneApiClient,
} from "@game-editor/editor-core";
import type { ComponentCatalogData } from "@game-editor/game-components";
import { foldersFromAssetDatabase } from "./folders-from-assets";
import {
  DemoProjectStore,
  throwDemoUnavailable,
  type DemoSnapshot,
  type DemoStorage,
} from "./demo-store";

export interface DemoEditorClients {
  sceneApi: SceneApiClient;
  assetApi: AssetApiClient;
  projectApi: ProjectApiClient;
  componentCatalogApi: ComponentCatalogApiClient;
}

export interface CreateDemoEditorClientsOptions {
  /** URL prefix for all demo games, e.g. `/html5-game-editor/demo/`. */
  assetBaseUrl: string;
  catalogs: Readonly<Record<string, ComponentCatalogData>>;
  storage?: DemoStorage;
}

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function createDemoEditorClients(
  snapshots: readonly DemoSnapshot[],
  options: CreateDemoEditorClientsOptions,
): DemoEditorClients {
  const store = new DemoProjectStore(snapshots, options.storage);
  const assetRoot = withTrailingSlash(options.assetBaseUrl);

  const resolverForActive = () =>
    createStaticAssetResolver(new AssetDatabase(store.assets), {
      baseUrl: `${assetRoot}${store.projectId}/`,
    });

  let resolver = resolverForActive();

  const sceneApi: SceneApiClient = {
    async listScenes() {
      return store.listSceneEntries();
    },
    async loadScene(sceneId) {
      return store.loadScene(sceneId);
    },
    async saveScene(sceneId, scene) {
      return store.saveScene(sceneId, scene);
    },
    async createScene(sceneId, name) {
      return store.createScene(sceneId, createEmptyScene(name ?? sceneId));
    },
    async renameScene(sceneId, newSceneId) {
      return store.renameScene(sceneId, newSceneId);
    },
    async deleteScene(sceneId) {
      store.deleteScene(sceneId);
    },
  };

  const assetApi: AssetApiClient = {
    async listAssets() {
      return {
        database: store.assets,
        revision: computeAssetDatabaseRevision(store.assets),
        folders: foldersFromAssetDatabase(store.assets),
      };
    },
    async importAssets() {
      throwDemoUnavailable("Asset import");
    },
    async createFolder() {
      throwDemoUnavailable("Create folder");
    },
    async renameAsset() {
      throwDemoUnavailable("Rename asset");
    },
    async moveAsset() {
      throwDemoUnavailable("Move asset");
    },
    async duplicateAsset() {
      throwDemoUnavailable("Duplicate asset");
    },
    async restoreAsset() {
      throwDemoUnavailable("Restore asset");
    },
    async deleteAsset() {
      throwDemoUnavailable("Delete asset");
    },
    async renameFolder() {
      throwDemoUnavailable("Rename folder");
    },
    async restoreFolder() {
      throwDemoUnavailable("Restore folder");
    },
    async deleteFolder() {
      throwDemoUnavailable("Delete folder");
    },
    getAssetContentUrl(assetId) {
      return resolver.resolveUrl(assetId) ?? "";
    },
    getAssetPartUrl(assetId, part) {
      return (
        resolver.resolveSpinePartUrl?.(assetId, part) ??
        resolver.resolveGltfPartUrl?.(assetId, part) ??
        resolver.resolveAsepritePartUrl?.(assetId, part) ??
        ""
      );
    },
  };

  const projectApi: ProjectApiClient = {
    async getProject() {
      return store.getProject();
    },
    async saveProject(project) {
      return store.saveProject(project);
    },
    async listProjects() {
      return {
        projects: store.listProjectSummaries(),
        activeProjectId: store.projectId,
      };
    },
    async openProject(projectId) {
      const project = store.openProject(projectId);
      resolver = resolverForActive();
      return { projectId: store.projectId, project };
    },
  };

  const componentCatalogApi: ComponentCatalogApiClient = {
    async getCatalog() {
      return (
        options.catalogs[store.projectId] ?? { components: [], busEvents: [] }
      );
    },
  };

  return { sceneApi, assetApi, projectApi, componentCatalogApi };
}
