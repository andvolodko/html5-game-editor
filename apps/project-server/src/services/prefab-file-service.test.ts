import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createContainerNode, createSpriteNode } from "@game-editor/scene";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { PrefabFileService } from "./prefab-file-service.js";

describe("PrefabFileService", () => {
  let root: string | undefined;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates, loads, and saves a validated prefab under assets/prefabs", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "prefab-service-"));
    const projectService = new ProjectService(root);
    const store = new AssetDatabaseStore(projectService);
    const service = new PrefabFileService(projectService, store);
    const rootNode = createContainerNode("Player");
    const child = createSpriteNode("Body", { x: 0, y: 0 }, { assetId: "asset_tex" });
    child.parentId = rootNode.id;
    rootNode.children = [child];

    const created = await service.createPrefab({
      name: "Player",
      root: rootNode,
    });
    expect(created.asset.type).toBe("prefab");
    expect(created.asset.path).toBe("assets/prefabs/Player.prefab.json");
    const written = await readFile(
      path.join(root, "assets/prefabs/Player.prefab.json"),
      "utf8",
    );
    expect(written).toContain("\"name\": \"Player\"");

    const loaded = await service.loadPrefab(created.asset.id);
    expect(loaded.root.name).toBe("Player");
    loaded.root.name = "Hero";
    const saved = await service.savePrefab(created.asset.id, loaded);
    expect(saved.root.name).toBe("Hero");
  });

  it("rejects destinations that escape assets/", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "prefab-service-"));
    const service = new PrefabFileService(
      new ProjectService(root),
      new AssetDatabaseStore(new ProjectService(root)),
    );
    await expect(
      service.createPrefab({
        name: "Bad",
        root: createContainerNode("Bad"),
        destination: "../outside.prefab.json",
      }),
    ).rejects.toThrow(/PATH_ESCAPE|Invalid prefab destination/);
  });
});
