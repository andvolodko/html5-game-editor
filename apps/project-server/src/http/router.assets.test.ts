import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import { ProjectService } from "../services/project-service.js";
import { ProjectFileService } from "../services/project-file-service.js";
import { SceneFileService } from "../services/scene-file-service.js";
import { AssetDatabaseStore } from "../services/asset-database-store.js";
import { AssetImporterRegistry } from "../services/asset-importer.js";
import { TextureAssetImporter } from "../services/texture-asset-importer.js";
import { SpineAssetImporter } from "../services/spine-asset-importer.js";
import { AssetImportService } from "../services/asset-import-service.js";
import { AssetFolderService } from "../services/asset-folder-service.js";
import { AssetMutationService } from "../services/asset-mutation-service.js";
import { AssetSyncService } from "../services/asset-sync-service.js";
import { createRouter } from "./router.js";

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function buildMultipart(
  fields: Record<string, string>,
  files: Array<{ field: string; fileName: string; bytes: Buffer; mime: string }>,
): { body: Buffer; contentType: string } {
  const boundary = "----vitestboundary";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.fileName}"\r\nContent-Type: ${file.mime}\r\n\r\n`,
      ),
    );
    chunks.push(file.bytes);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("assets HTTP routes", () => {
  let root = "";
  let baseUrl = "";
  let server: ReturnType<typeof createServer> | undefined;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-http-assets-"));
    const projectService = new ProjectService(root);
    const assetDatabaseStore = new AssetDatabaseStore(projectService);
    const registry = new AssetImporterRegistry();
    registry.register(new TextureAssetImporter());
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
    const sceneFileService = new SceneFileService(projectService);
    const router = createRouter({
      projectService,
      sceneFileService,
      projectFileService: new ProjectFileService(
        projectService,
        sceneFileService,
      ),
      assetDatabaseStore,
      assetImportService,
      assetFolderService,
      assetMutationService: new AssetMutationService(
        projectService,
        assetDatabaseStore,
        assetFolderService,
      ),
      assetSyncService,
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
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(root, { recursive: true, force: true });
  });

  it("lists, imports via multipart, and serves content", async () => {
    const empty = await fetch(`${baseUrl}/assets`);
    const emptyJson = (await empty.json()) as {
      ok: boolean;
      database: { assets: unknown[] };
      folders: string[];
      revision: string;
    };
    expect(empty.ok).toBe(true);
    expect(emptyJson.database.assets).toEqual([]);
    expect(emptyJson.folders).toEqual(["assets"]);
    expect(emptyJson.revision).toMatch(/^a/);

    const multipart = buildMultipart(
      { destination: "assets/symbols" },
      [
        {
          field: "files",
          fileName: "hero.png",
          bytes: tinyPng(),
          mime: "image/png",
        },
      ],
    );
    const imported = await fetch(`${baseUrl}/assets/import`, {
      method: "POST",
      headers: { "content-type": multipart.contentType },
      body: multipart.body,
    });
    const importJson = (await imported.json()) as {
      ok: boolean;
      imported: Array<{ id: string; path: string }>;
      revision: string;
      database: { assets: unknown[] };
      folders: string[];
    };
    expect(imported.status).toBe(200);
    expect(importJson.imported).toHaveLength(1);
    expect(importJson.imported[0]?.path).toBe("assets/symbols/hero.png");
    expect(importJson.database.assets).toHaveLength(1);
    expect(importJson.folders).toEqual(["assets", "assets/symbols"]);

    const manifest = await readFile(path.join(root, ".project", "assets.json"), "utf8");
    expect(manifest).toContain("assets/symbols/hero.png");

    const assetId = importJson.imported[0]!.id;
    const content = await fetch(`${baseUrl}/assets/${encodeURIComponent(assetId)}/content`);
    expect(content.ok).toBe(true);
    expect(content.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await content.arrayBuffer());
    expect(bytes.equals(tinyPng())).toBe(true);
  });

  it("creates empty folders for the asset browser", async () => {
    const created = await fetch(`${baseUrl}/assets/folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "assets/ui/buttons" }),
    });
    const createdJson = (await created.json()) as {
      ok: boolean;
      folder: string;
      folders: string[];
    };
    expect(created.status).toBe(200);
    expect(createdJson.folder).toBe("assets/ui/buttons");
    expect(createdJson.folders).toContain("assets");
    expect(createdJson.folders).toContain("assets/ui");
    expect(createdJson.folders).toContain("assets/ui/buttons");

    const listed = await fetch(`${baseUrl}/assets`);
    const listedJson = (await listed.json()) as { folders: string[] };
    expect(listedJson.folders).toContain("assets/ui/buttons");
  });

  it("renames and moves assets while keeping stable ids", async () => {
    const multipart = buildMultipart(
      { destination: "assets" },
      [
        {
          field: "files",
          fileName: "token.png",
          bytes: tinyPng(),
          mime: "image/png",
        },
      ],
    );
    const imported = await fetch(`${baseUrl}/assets/import`, {
      method: "POST",
      headers: { "content-type": multipart.contentType },
      body: multipart.body,
    });
    const importJson = (await imported.json()) as {
      ok: boolean;
      imported: Array<{ id: string; path: string; name: string }>;
    };
    const assetId = importJson.imported[0]!.id;

    await fetch(`${baseUrl}/assets/folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "assets/icons" }),
    });

    const renamed = await fetch(`${baseUrl}/assets/${encodeURIComponent(assetId)}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "coin" }),
    });
    const renamedJson = (await renamed.json()) as {
      ok: boolean;
      asset: { id: string; name: string; path: string };
    };
    expect(renamed.status).toBe(200);
    expect(renamedJson.asset.id).toBe(assetId);
    expect(renamedJson.asset.name).toBe("coin");
    expect(renamedJson.asset.path).toBe("assets/coin.png");

    const moved = await fetch(`${baseUrl}/assets/${encodeURIComponent(assetId)}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destination: "assets/icons" }),
    });
    const movedJson = (await moved.json()) as {
      ok: boolean;
      asset: { id: string; path: string };
    };
    expect(moved.status).toBe(200);
    expect(movedJson.asset.id).toBe(assetId);
    expect(movedJson.asset.path).toBe("assets/icons/coin.png");
  });

  it("lists scenes", async () => {
    const saved = await fetch(`${baseUrl}/scenes/main`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createEmptyScene("Main")),
    });
    expect(saved.status).toBe(200);

    const listed = await fetch(`${baseUrl}/scenes`);
    const listedJson = (await listed.json()) as {
      ok: boolean;
      scenes: Array<{ id: string; path: string }>;
    };
    expect(listed.status).toBe(200);
    expect(listedJson.scenes).toEqual([{ id: "main", path: "assets/scenes/main.json" }]);
  });

  it("creates scenes via POST", async () => {
    const created = await fetch(`${baseUrl}/scenes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "intro", name: "Intro" }),
    });
    const createdJson = (await created.json()) as {
      ok: boolean;
      scene: { name: string };
    };
    expect(created.status).toBe(201);
    expect(createdJson.scene.name).toBe("Intro");

    const duplicate = await fetch(`${baseUrl}/scenes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "intro" }),
    });
    expect(duplicate.status).toBe(400);
  });

  it("renames scenes via PATCH", async () => {
    const created = await fetch(`${baseUrl}/scenes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "rename-me", name: "Rename Me" }),
    });
    expect(created.status).toBe(201);

    const renamed = await fetch(`${baseUrl}/scenes/rename-me`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "renamed" }),
    });
    const renamedJson = (await renamed.json()) as {
      ok: boolean;
      scene: { id: string; path: string };
    };
    expect(renamed.status).toBe(200);
    expect(renamedJson.scene).toEqual({
      id: "renamed",
      path: "assets/scenes/renamed.json",
    });

    const listed = await fetch(`${baseUrl}/scenes`);
    const listedJson = (await listed.json()) as {
      ok: boolean;
      scenes: Array<{ id: string; path: string }>;
    };
    expect(listedJson.scenes.some((s) => s.id === "renamed")).toBe(true);
    expect(listedJson.scenes.some((s) => s.id === "rename-me")).toBe(false);
  });

  it("imports a spine bundle and serves allowlisted parts only", async () => {
    const atlas = Buffer.from(`hero.png
size: 1,1
format: RGBA8888
filter: Linear,Linear
repeat: none
root
  rotate: false
  xy: 0, 0
  size: 1, 1
`);
    const skeleton = Buffer.from(
      JSON.stringify({
        skeleton: { spine: "4.2.0" },
        bones: [{ name: "root" }],
        skins: [{ name: "default" }],
        animations: { idle: {} },
      }),
    );
    const multipart = buildMultipart(
      { destination: "assets" },
      [
        { field: "files", fileName: "hero.json", bytes: skeleton, mime: "application/json" },
        { field: "files", fileName: "hero.atlas", bytes: atlas, mime: "text/plain" },
        { field: "files", fileName: "hero.png", bytes: tinyPng(), mime: "image/png" },
      ],
    );
    const imported = await fetch(`${baseUrl}/assets/import`, {
      method: "POST",
      headers: { "content-type": multipart.contentType },
      body: multipart.body,
    });
    const importJson = (await imported.json()) as {
      ok: boolean;
      imported: Array<{ id: string; type: string }>;
    };
    expect(imported.status).toBe(200);
    expect(importJson.imported[0]?.type).toBe("spine");
    const assetId = importJson.imported[0]!.id;

    const atlasPart = await fetch(
      `${baseUrl}/assets/${encodeURIComponent(assetId)}/part/hero.atlas`,
    );
    expect(atlasPart.ok).toBe(true);
    expect(await atlasPart.text()).toContain("hero.png");

    const pagePart = await fetch(
      `${baseUrl}/assets/${encodeURIComponent(assetId)}/part/hero.png`,
    );
    expect(pagePart.ok).toBe(true);
    expect(pagePart.headers.get("content-type")).toBe("image/png");

    const escaped = await fetch(
      `${baseUrl}/assets/${encodeURIComponent(assetId)}/part/..%2Fsecret`,
    );
    expect(escaped.status).toBe(404);

    const unknown = await fetch(
      `${baseUrl}/assets/${encodeURIComponent(assetId)}/part/hero.json`,
    );
    expect(unknown.status).toBe(404);
  });

  it("GET /assets reconciles new and missing files automatically", async () => {
    await mkdir(path.join(root, "assets"), { recursive: true });
    await writeFile(path.join(root, "assets", "external.png"), tinyPng());

    const listed = await fetch(`${baseUrl}/assets`);
    const listedJson = (await listed.json()) as {
      ok: boolean;
      database: { assets: Array<{ id: string; path: string }> };
    };
    expect(listed.ok).toBe(true);
    const discovered = listedJson.database.assets.find(
      (asset) => asset.path === "assets/external.png",
    );
    expect(discovered).toBeDefined();

    await unlink(path.join(root, "assets", "external.png"));
    const afterDelete = await fetch(`${baseUrl}/assets`);
    const afterJson = (await afterDelete.json()) as {
      database: { assets: Array<{ path: string }> };
    };
    expect(
      afterJson.database.assets.some((asset) => asset.path === "assets/external.png"),
    ).toBe(false);
  });
});
