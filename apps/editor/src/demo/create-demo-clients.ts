import {
  AssetDatabase,
  computeAssetDatabaseRevision,
  computeTileSetGrid,
  createPrefabAssetRecord,
  createStaticAssetResolver,
  createTileSetAssetRecord,
  DEFAULT_TILESET_TILE_SIZE,
  parseTileSetData,
  rasterAssetDisplaySize,
  TILESET_SCHEMA_VERSION,
} from "@game-editor/assets";
import { createEmptyScene, parsePrefabData, PREFAB_SCHEMA_VERSION } from "@game-editor/scene";
import { createId } from "@game-editor/shared";
import { DomainError } from "@game-editor/core";
import type {
  AssetApiClient,
  ComponentCatalogApiClient,
  PrefabApiClient,
  ProjectApiClient,
  SceneApiClient,
  TileSetApiClient,
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
  prefabApi: PrefabApiClient;
  tileSetApi: TileSetApiClient;
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

  const prefabApi: PrefabApiClient = {
    async createPrefab(input) {
      const prefab = parsePrefabData({
        version: PREFAB_SCHEMA_VERSION,
        id: createId("prefab"),
        name: input.name.trim() || "Prefab",
        root: input.root,
      });
      const path = store.allocatePrefabPath(prefab.name, input.destination);
      const asset = createPrefabAssetRecord({
        name: prefab.name,
        path,
        prefabId: prefab.id,
      });
      store.addPrefabAsset(asset, prefab);
      resolver = resolverForActive();
      return { asset, prefab };
    },
    async savePrefab(assetId, prefab) {
      return store.savePrefab(assetId, prefab);
    },
    async loadPrefab(assetId) {
      const prefab = store.getPrefab(assetId);
      if (!prefab) {
        throw new DomainError("PREFAB_NOT_FOUND", `Prefab asset not found: ${assetId}`);
      }
      return prefab;
    },
  };

  const tileSetApi: TileSetApiClient = {
    async createTileSet(input) {
      const image = store.assets.assets.find(
        (asset) => asset.id === input.imageAssetId,
      );
      if (!image || image.type !== "texture") {
        throw new DomainError(
          "TEXTURE_NOT_FOUND",
          `Texture asset not found: ${input.imageAssetId}`,
        );
      }
      const size = rasterAssetDisplaySize(image);
      const tileWidth = input.tileWidth ?? DEFAULT_TILESET_TILE_SIZE;
      const tileHeight = input.tileHeight ?? DEFAULT_TILESET_TILE_SIZE;
      const margin = input.margin ?? 0;
      const spacing = input.spacing ?? 0;
      const grid = computeTileSetGrid({
        imageWidth: size?.width ?? tileWidth,
        imageHeight: size?.height ?? tileHeight,
        tileWidth,
        tileHeight,
        margin,
        spacing,
      });
      const tileset = parseTileSetData({
        version: TILESET_SCHEMA_VERSION,
        id: createId("tileset"),
        name: input.name.trim() || "TileSet",
        imageAssetId: input.imageAssetId,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        columns: grid.columns,
        rows: grid.rows,
      });
      const path = store.allocateTileSetPath(tileset.name, input.destination);
      const asset = createTileSetAssetRecord({
        name: tileset.name,
        path,
        tilesetId: tileset.id,
        imageAssetId: tileset.imageAssetId,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        margin: tileset.margin,
        spacing: tileset.spacing,
        columns: tileset.columns,
        rows: tileset.rows,
      });
      store.addTileSetAsset(asset, tileset);
      resolver = resolverForActive();
      return { asset, tileset };
    },
    async saveTileSet(assetId, tileset) {
      return store.saveTileSet(assetId, tileset);
    },
    async loadTileSet(assetId) {
      const tileset = store.getTileSet(assetId);
      if (!tileset) {
        throw new DomainError(
          "TILESET_NOT_FOUND",
          `TileSet asset not found: ${assetId}`,
        );
      }
      return tileset;
    },
  };

  return {
    sceneApi,
    assetApi,
    projectApi,
    componentCatalogApi,
    prefabApi,
    tileSetApi,
  };
}
