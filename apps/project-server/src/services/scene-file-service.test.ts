import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode, parseSceneData } from "@game-editor/scene";
import { ProjectService } from "./project-service.js";
import { SceneFileService } from "./scene-file-service.js";

describe("SceneFileService", () => {
  it("saves and loads a validated scene under the project root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      const scene = createEmptyScene("Persist");
      scene.nodes.push(createSpriteNode("Hero", { x: 12, y: 34 }));

      const saved = await service.saveScene("main", scene);
      expect(saved.nodes).toHaveLength(1);

      const absolute = path.join(root, "assets", "scenes", "main.json");
      const raw = await readFile(absolute, "utf8");
      expect(raw).not.toMatch(/PIXI|Application|Container/);

      const loaded = await service.loadScene("main");
      expect(parseSceneData(loaded).nodes[0]?.name).toBe("Hero");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsafe scene ids", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      await expect(service.loadScene("../secret")).rejects.toThrow(/Invalid scene id/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists scene files under assets/scenes/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-list-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      await service.saveScene("main", createEmptyScene("Main"));
      await service.saveScene("intro", createEmptyScene("Intro"));
      expect(await service.listScenes()).toEqual([
        { id: "intro", path: "assets/scenes/intro.json" },
        { id: "main", path: "assets/scenes/main.json" },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates a new scene under assets/scenes/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-create-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      const created = await service.createScene("level-1", "Level 1");
      expect(created.name).toBe("Level 1");
      expect(created.nodes).toEqual([]);

      const absolute = path.join(root, "assets", "scenes", "level-1.json");
      const raw = await readFile(absolute, "utf8");
      expect(raw).toContain('"name": "Level 1"');

      await expect(service.createScene("level-1")).rejects.toThrow(/already exists/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("renames a scene file under assets/scenes/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-rename-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      await service.createScene("old", "Old");
      const renamed = await service.renameScene("old", "new");
      expect(renamed).toEqual({ id: "new", path: "assets/scenes/new.json" });
      expect(await service.listScenes()).toEqual([
        { id: "new", path: "assets/scenes/new.json" },
      ]);
      await expect(service.loadScene("old")).rejects.toThrow(/not found/i);
      expect((await service.loadScene("new")).name).toBe("Old");

      await expect(service.renameScene("missing", "x")).rejects.toThrow(/not found/i);
      await service.createScene("taken");
      await expect(service.renameScene("new", "taken")).rejects.toThrow(/already exists/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("deletes a scene file and refuses deleting the last scene", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-scene-delete-"));
    try {
      const service = new SceneFileService(new ProjectService(root));
      await service.createScene("a", "A");
      await service.createScene("b", "B");
      await service.deleteScene("a");
      expect(await service.listScenes()).toEqual([
        { id: "b", path: "assets/scenes/b.json" },
      ]);
      await expect(service.deleteScene("b")).rejects.toThrow(/last scene/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects oversized request bodies", async () => {
    const { MAX_JSON_BODY_BYTES, readJsonBody } = await import("../http/responses.js");
    const huge = "x".repeat(MAX_JSON_BODY_BYTES + 1);
    const req = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(huge);
      },
    };
    await expect(readJsonBody(req as never, MAX_JSON_BODY_BYTES)).rejects.toThrow(
      /exceeds/,
    );
  });
});
