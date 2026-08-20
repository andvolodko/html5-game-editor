import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import { PROJECT_SCHEMA_VERSION, type ProjectData } from "@game-editor/project";
import { ProjectService } from "./project-service.js";
import { ProjectFileService } from "./project-file-service.js";
import { SceneFileService } from "./scene-file-service.js";

async function writeProjectJson(
  root: string,
  project: Partial<ProjectData> & Pick<ProjectData, "name" | "displayName">,
): Promise<void> {
  const payload: ProjectData = {
    name: project.name,
    version: project.version ?? PROJECT_SCHEMA_VERSION,
    displayName: project.displayName,
    renderers: project.renderers ?? ["pixi"],
    startScene: project.startScene ?? "main",
    resolution: project.resolution ?? { width: 1280, height: 720 },
    scaleMode: project.scaleMode ?? "cover",
    background: project.background ?? "#0b0d12",
  };
  await writeFile(
    path.join(root, "project.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

describe("ProjectFileService", () => {
  let root = "";

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  async function setup(startScene = "main") {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-project-file-"));
    await mkdir(path.join(root, "assets", "scenes"), { recursive: true });
    await writeFile(
      path.join(root, "assets", "scenes", "main.json"),
      `${JSON.stringify(createEmptyScene("Main"), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "assets", "scenes", "intro.json"),
      `${JSON.stringify(createEmptyScene("Intro"), null, 2)}\n`,
      "utf8",
    );
    await writeProjectJson(root, {
      name: "test-game",
      displayName: "Test Game",
      startScene,
    });
    const projectService = new ProjectService(root);
    const sceneFileService = new SceneFileService(projectService);
    const projectFileService = new ProjectFileService(
      projectService,
      sceneFileService,
    );
    return { projectFileService, sceneFileService };
  }

  it("loads and updates startScene", async () => {
    const { projectFileService } = await setup();
    const loaded = await projectFileService.loadProject();
    expect(loaded.startScene).toBe("main");

    const updated = await projectFileService.setStartScene("intro");
    expect(updated.startScene).toBe("intro");
    const raw = await readFile(path.join(root, "project.json"), "utf8");
    expect(JSON.parse(raw).startScene).toBe("intro");
  });

  it("rejects startScene that does not exist", async () => {
    const { projectFileService } = await setup();
    await expect(projectFileService.setStartScene("missing")).rejects.toThrow(
      /does not exist/,
    );
  });

  it("defaults missing startScene on load", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-project-file-"));
    await mkdir(path.join(root, "assets", "scenes"), { recursive: true });
    await writeFile(
      path.join(root, "assets", "scenes", "main.json"),
      `${JSON.stringify(createEmptyScene("Main"), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "project.json"),
      `${JSON.stringify({
        name: "legacy",
        version: 1,
        displayName: "Legacy",
        renderers: ["pixi"],
      }, null, 2)}\n`,
      "utf8",
    );
    const projectService = new ProjectService(root);
    const service = new ProjectFileService(
      projectService,
      new SceneFileService(projectService),
    );
    const loaded = await service.loadProject();
    expect(loaded.startScene).toBe("main");
  });

  it("rewrites startScene on rename and delete", async () => {
    const { projectFileService, sceneFileService } = await setup("main");
    await sceneFileService.renameScene("main", "boot");
    await projectFileService.onSceneRenamed("main", "boot");
    expect((await projectFileService.loadProject()).startScene).toBe("boot");

    await sceneFileService.deleteScene("boot");
    await projectFileService.onSceneDeleted("boot", "intro");
    expect((await projectFileService.loadProject()).startScene).toBe("intro");
  });
});
