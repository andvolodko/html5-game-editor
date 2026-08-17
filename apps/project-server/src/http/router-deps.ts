import type { ProjectService } from "../services/project-service.js";
import type { ProjectFileService } from "../services/project-file-service.js";
import type { ProjectCatalogService } from "../services/project-catalog-service.js";
import type { SceneFileService } from "../services/scene-file-service.js";
import type { AssetDatabaseStore } from "../services/asset-database-store.js";
import type { AssetImportService } from "../services/asset-import-service.js";
import type { AssetFolderService } from "../services/asset-folder-service.js";
import type { AssetMutationService } from "../services/asset-mutation-service.js";
import type { AssetSyncService } from "../services/asset-sync-service.js";
import type { ComponentCatalogService } from "../services/component-catalog-service.js";
import type { PrefabFileService } from "../services/prefab-file-service.js";
import type { TileSetFileService } from "../services/tileset-file-service.js";

export interface RouterDeps {
  projectService: ProjectService;
  projectFileService: ProjectFileService;
  sceneFileService: SceneFileService;
  assetDatabaseStore: AssetDatabaseStore;
  /** Facade over the AssetImporter registry — not a concrete Texture importer. */
  assetImportService: AssetImportService;
  assetFolderService: AssetFolderService;
  assetMutationService: AssetMutationService;
  assetSyncService: AssetSyncService;
  /** Optional: list/switch games under the games workspace. */
  projectCatalogService?: ProjectCatalogService;
  /** Optional: script component catalog for the active project. */
  componentCatalogService?: ComponentCatalogService;
  prefabFileService: PrefabFileService;
  tileSetFileService: TileSetFileService;
}
