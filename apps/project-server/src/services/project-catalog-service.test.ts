import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION } from "@game-editor/project";
import { createEmptyScene } from "@game-editor/scene";
import { ProjectService } from "./project-service.js";
import { ProjectCatalogService } from "./project-catalog-service.js";

async function writeGame(
  gamesRoot: string,
  id: string,
  displayName: string,
): Promise<void> {
  const root = path.join(gamesRoot, id);
  await mkdir(path.join(root, "assets", "scenes"), { recursive: true });
  await writeFile(
    path.join(root, "assets", "scenes", "main.json"),
    `${JSON.stringify(createEmptyScene("Main"), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, "project.json"),
    `${JSON.stringify({
      name: id,
      version: PROJECT_SCHEMA_VERSION,
      displayName,
      renderers: ["pixi"],
      startScene: "main",
    }, null, 2)}\n`,
    "utf8",
  );
}

describe("ProjectCatalogService", () => {
  let gamesRoot = "";

  afterEach(async () => {
    if (gamesRoot) {
      await rm(gamesRoot, { recursive: true, force: true });
      gamesRoot = "";
    }
  });

  it("lists only directories with valid project.json", async () => {
    gamesRoot = await mkdtemp(path.join(os.tmpdir(), "game-editor-catalog-"));
    await writeGame(gamesRoot, "alpha-game", "Alpha");
    await writeGame(gamesRoot, "beta-game", "Beta");
    await mkdir(path.join(gamesRoot, "not-a-project"), { recursive: true });
    await writeFile(path.join(gamesRoot, "readme.txt"), "ignore\n", "utf8");

    const projectService = new ProjectService(
      path.join(gamesRoot, "alpha-game"),
    );
    const catalog = new ProjectCatalogService(gamesRoot, projectService);

    await expect(catalog.listProjects()).resolves.toEqual([
      {
        id: "alpha-game",
        name: "alpha-game",
        displayName: "Alpha",
        renderers: ["pixi"],
      },
      {
        id: "beta-game",
        name: "beta-game",
        displayName: "Beta",
        renderers: ["pixi"],
      },
    ]);
    expect(catalog.getActiveProjectId()).toBe("alpha-game");
  });

  it("opens an allowlisted project and rejects traversal ids", async () => {
    gamesRoot = await mkdtemp(path.join(os.tmpdir(), "game-editor-catalog-"));
    await writeGame(gamesRoot, "alpha-game", "Alpha");
    await writeGame(gamesRoot, "beta-game", "Beta");

    const projectService = new ProjectService(
      path.join(gamesRoot, "alpha-game"),
    );
    const catalog = new ProjectCatalogService(gamesRoot, projectService);

    await expect(catalog.openProject("beta-game")).resolves.toBe("beta-game");
    expect(projectService.getProjectRoot()).toBe(
      path.resolve(gamesRoot, "beta-game"),
    );
    expect(catalog.getActiveProjectId()).toBe("beta-game");

    await expect(catalog.openProject("../beta-game")).rejects.toThrow(
      /Invalid project id/,
    );
    await expect(catalog.openProject("missing-game")).rejects.toThrow(
      /Project not found/,
    );
  });
});
