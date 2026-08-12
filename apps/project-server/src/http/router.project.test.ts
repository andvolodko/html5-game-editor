import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import { PROJECT_SCHEMA_VERSION } from "@game-editor/project";
import { ProjectService } from "../services/project-service.js";
import { ProjectCatalogService } from "../services/project-catalog-service.js";
import { ProjectFileService } from "../services/project-file-service.js";
import { SceneFileService } from "../services/scene-file-service.js";
import { AssetDatabaseStore } from "../services/asset-database-store.js";
import { AssetImporterRegistry } from "../services/asset-importer.js";
import { TextureAssetImporter } from "../services/texture-asset-importer.js";
import { SpineAssetImporter } from "../services/spine-asset-importer.js";
import { AudioAssetImporter } from "../services/audio-asset-importer.js";
import { AssetImportService } from "../services/asset-import-service.js";
import { AssetFolderService } from "../services/asset-folder-service.js";
import { AssetMutationService } from "../services/asset-mutation-service.js";
import { AssetSyncService } from "../services/asset-sync-service.js";
import { createRouter } from "./router.js";

async function writeMinimalGame(
  gameRoot: string,
  name: string,
  displayName: string,
  scenes: string[] = ["main"],
): Promise<void> {
  await mkdir(path.join(gameRoot, "assets", "scenes"), { recursive: true });
  for (const sceneId of scenes) {
    await writeFile(
      path.join(gameRoot, "assets", "scenes", `${sceneId}.json`),
      `${JSON.stringify(createEmptyScene(sceneId), null, 2)}\n`,
      "utf8",
    );
  }
  await writeFile(
    path.join(gameRoot, "project.json"),
    `${JSON.stringify({
      name,
      version: PROJECT_SCHEMA_VERSION,
      displayName,
      renderers: ["pixi"],
      startScene: scenes[0] ?? "main",
    }, null, 2)}\n`,
    "utf8",
  );
}

describe("project HTTP routes", () => {
  let workspace = "";
  let root = "";
  let baseUrl = "";
  let server: ReturnType<typeof createServer> | undefined;

  beforeAll(async () => {
    workspace = await mkdtemp(path.join(os.tmpdir(), "game-editor-http-project-"));
    const gamesRoot = path.join(workspace, "games");
    root = path.join(gamesRoot, "test-game");
    await writeMinimalGame(root, "test-game", "Test Game", ["main", "intro"]);
    await writeMinimalGame(
      path.join(gamesRoot, "other-game"),
      "other-game",
      "Other Game",
    );

    const projectService = new ProjectService(root);
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
    const registry = new AssetImporterRegistry();
    registry.register(new TextureAssetImporter());
    registry.register(new AudioAssetImporter());
    registry.registerBundle(new SpineAssetImporter());
    const assetImportService = new AssetImportService(
      projectService,
      assetDatabaseStore,
      registry,
    );
    const assetFolderService = new AssetFolderService(projectService);
    const assetSyncService = new AssetSyncService(
      projectService,
      assetDatabaseStore,
      registry,
    );
    const router = createRouter({
      projectService,
      sceneFileService,
      projectFileService,
      assetDatabaseStore,
      assetImportService,
      assetFolderService,
      assetMutationService: new AssetMutationService(
        projectService,
        assetDatabaseStore,
        assetFolderService,
      ),
      assetSyncService,
      projectCatalogService,
    });

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      void router.handle(req, res);
    });

    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }
      server.close((err) => (err ? reject(err) : resolve()));
    });
    if (workspace) {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("GET /projects lists discoverable games", async () => {
    const response = await fetch(`${baseUrl}/projects`);
    const payload = (await response.json()) as {
      ok: boolean;
      projects?: Array<{ id: string; displayName: string }>;
      activeProjectId?: string | null;
    };
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.activeProjectId).toBe("test-game");
    expect(payload.projects).toEqual([
      expect.objectContaining({ id: "other-game", displayName: "Other Game" }),
      expect.objectContaining({ id: "test-game", displayName: "Test Game" }),
    ]);
  });

  it("POST /project/open switches active root", async () => {
    const response = await fetch(`${baseUrl}/project/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "other-game" }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      projectId?: string;
      project?: { name: string; displayName: string };
    };
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.projectId).toBe("other-game");
    expect(payload.project?.displayName).toBe("Other Game");

    const listed = await fetch(`${baseUrl}/projects`);
    const listedPayload = (await listed.json()) as {
      activeProjectId?: string | null;
    };
    expect(listedPayload.activeProjectId).toBe("other-game");

    // Restore primary fixture project for remaining sequential tests.
    const restore = await fetch(`${baseUrl}/project/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "test-game" }),
    });
    expect(restore.status).toBe(200);
  });

  it("POST /project/open rejects path traversal ids", async () => {
    const response = await fetch(`${baseUrl}/project/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "../other-game" }),
    });
    expect(response.status).toBe(400);
  });

  it("GET /project returns project.json", async () => {
    const response = await fetch(`${baseUrl}/project`);
    const payload = (await response.json()) as {
      ok: boolean;
      project?: { startScene: string; displayName: string };
      projectId?: string | null;
    };
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.project?.startScene).toBe("main");
    expect(payload.project?.displayName).toBe("Test Game");
    expect(payload.projectId).toBe("test-game");
  });

  it("PUT /project updates startScene", async () => {
    const response = await fetch(`${baseUrl}/project`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "test-game",
        version: PROJECT_SCHEMA_VERSION,
        displayName: "Test Game",
        renderers: ["pixi"],
        startScene: "intro",
      }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      project?: { startScene: string };
    };
    expect(response.status).toBe(200);
    expect(payload.project?.startScene).toBe("intro");
    const raw = JSON.parse(await readFile(path.join(root, "project.json"), "utf8")) as {
      startScene: string;
    };
    expect(raw.startScene).toBe("intro");
  });

  it("PUT /project rejects missing startScene file", async () => {
    const response = await fetch(`${baseUrl}/project`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "test-game",
        version: PROJECT_SCHEMA_VERSION,
        displayName: "Test Game",
        renderers: ["pixi"],
        startScene: "nope",
      }),
    });
    expect(response.status).toBe(400);
  });

  it("renaming start scene updates project.json", async () => {
    await fetch(`${baseUrl}/project`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "test-game",
        version: PROJECT_SCHEMA_VERSION,
        displayName: "Test Game",
        renderers: ["pixi"],
        startScene: "intro",
      }),
    });

    const response = await fetch(`${baseUrl}/scenes/intro`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "boot" }),
    });
    expect(response.status).toBe(200);
    const raw = JSON.parse(await readFile(path.join(root, "project.json"), "utf8")) as {
      startScene: string;
    };
    expect(raw.startScene).toBe("boot");
  });

  it("deleting start scene retargets to another scene", async () => {
    const before = JSON.parse(
      await readFile(path.join(root, "project.json"), "utf8"),
    ) as { startScene: string };
    expect(before.startScene).toBe("boot");

    const response = await fetch(`${baseUrl}/scenes/boot`, { method: "DELETE" });
    expect(response.status).toBe(200);
    const raw = JSON.parse(await readFile(path.join(root, "project.json"), "utf8")) as {
      startScene: string;
    };
    expect(raw.startScene).toBe("main");
  });
});
