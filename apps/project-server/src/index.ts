import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ProjectService } from "./services/project-service.js";
import { ProjectCatalogService } from "./services/project-catalog-service.js";
import { ProjectFileService } from "./services/project-file-service.js";
import { SceneFileService } from "./services/scene-file-service.js";
import { AssetDatabaseStore } from "./services/asset-database-store.js";
import { AssetImporterRegistry } from "./services/asset-importer.js";
import { TextureAssetImporter } from "./services/texture-asset-importer.js";
import { SpineAssetImporter } from "./services/spine-asset-importer.js";
import { AssetImportService } from "./services/asset-import-service.js";
import { AssetFolderService } from "./services/asset-folder-service.js";
import { AssetMutationService } from "./services/asset-mutation-service.js";
import { AssetSyncService } from "./services/asset-sync-service.js";
import { ComponentCatalogService } from "./services/component-catalog-service.js";
import { createRouter } from "./http/router.js";
import { sendNoContent } from "./http/responses.js";
import { DEFAULT_PROJECT_SERVER_PORT } from "@game-editor/shared";

const port = Number(process.env.PORT ?? DEFAULT_PROJECT_SERVER_PORT);
const here = path.dirname(fileURLToPath(import.meta.url));
const defaultGamesRoot = path.resolve(here, "../../../games");
const gamesRoot = process.env.GAMES_ROOT ?? defaultGamesRoot;
const defaultProjectRoot = path.join(gamesRoot, "example-game");
const projectRoot = process.env.PROJECT_ROOT ?? defaultProjectRoot;

const projectService = new ProjectService(projectRoot);
const projectCatalogService = new ProjectCatalogService(
  gamesRoot,
  projectService,
);
const sceneFileService = new SceneFileService(projectService);
const projectFileService = new ProjectFileService(
  projectService,
  sceneFileService,
);
const assetDatabaseStore = new AssetDatabaseStore(projectService);

const importerRegistry = new AssetImporterRegistry();
importerRegistry.register(new TextureAssetImporter());
importerRegistry.registerBundle(new SpineAssetImporter());

const assetImportService = new AssetImportService(
  projectService,
  assetDatabaseStore,
  importerRegistry,
);
const assetFolderService = new AssetFolderService(projectService);
const assetMutationService = new AssetMutationService(
  projectService,
  assetDatabaseStore,
  assetFolderService,
);
const assetSyncService = new AssetSyncService(
  projectService,
  assetDatabaseStore,
  importerRegistry,
);
const componentCatalogService = new ComponentCatalogService(projectService);

const router = createRouter({
  projectService,
  projectFileService,
  sceneFileService,
  assetDatabaseStore,
  assetImportService,
  assetFolderService,
  assetMutationService,
  assetSyncService,
  projectCatalogService,
  componentCatalogService,
});

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }
  void router.handle(req, res);
});

server.listen(port, () => {
  process.stdout.write(
    `project-server listening on http://localhost:${port} (root=${projectRoot}, games=${gamesRoot})\n`,
  );
});
