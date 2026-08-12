import { describe, expect, it, vi } from "vitest";
import { PROJECT_SCHEMA_VERSION, type ProjectData } from "@game-editor/project";
import { createFetchProjectApiClient } from "./project-api-client.js";
import { ProjectManager } from "./project-manager.js";

const sample: ProjectData = {
  name: "example-game",
  version: PROJECT_SCHEMA_VERSION,
  displayName: "Example Game",
  renderers: ["pixi"],
  startScene: "main",
};

const sampleTwo: ProjectData = {
  name: "example-game-2",
  version: PROJECT_SCHEMA_VERSION,
  displayName: "Example Game 2",
  renderers: ["pixi"],
  startScene: "main",
};

describe("ProjectManager", () => {
  it("refreshes and sets startScene via API", async () => {
    const getProject = vi.fn(async () => sample);
    const saveProject = vi.fn(async (project: ProjectData) => project);
    const listProjects = vi.fn(async () => ({
      projects: [
        {
          id: "example-game",
          name: sample.name,
          displayName: sample.displayName,
          renderers: sample.renderers,
        },
      ],
      activeProjectId: "example-game",
    }));
    const openProject = vi.fn(async () => ({
      projectId: "example-game",
      project: sample,
    }));
    const manager = new ProjectManager({
      getProject,
      saveProject,
      listProjects,
      openProject,
    });

    await manager.refresh();
    expect(manager.getProject()?.startScene).toBe("main");
    expect(manager.getActiveProjectId()).toBe("example-game");

    await manager.setStartScene("intro");
    expect(saveProject).toHaveBeenCalledWith({
      ...sample,
      startScene: "intro",
    });
    expect(manager.getProject()?.startScene).toBe("intro");
  });

  it("skips save when startScene unchanged", async () => {
    const saveProject = vi.fn(async (project: ProjectData) => project);
    const manager = new ProjectManager({
      getProject: async () => sample,
      saveProject,
      listProjects: async () => ({
        projects: [],
        activeProjectId: null,
      }),
      openProject: async () => ({ projectId: "example-game", project: sample }),
    });
    await manager.refresh();
    await manager.setStartScene("main");
    expect(saveProject).not.toHaveBeenCalled();
  });

  it("opens a project and updates active id", async () => {
    const openProject = vi.fn(async () => ({
      projectId: "example-game-2",
      project: sampleTwo,
    }));
    const manager = new ProjectManager({
      getProject: async () => sample,
      saveProject: async (project) => project,
      listProjects: async () => ({
        projects: [
          { id: "example-game", name: sample.name, displayName: sample.displayName, renderers: sample.renderers },
          {
            id: "example-game-2",
            name: sampleTwo.name,
            displayName: sampleTwo.displayName,
            renderers: sampleTwo.renderers,
          },
        ],
        activeProjectId: "example-game",
      }),
      openProject,
    });

    const opened = await manager.openProject("example-game-2");
    expect(openProject).toHaveBeenCalledWith("example-game-2");
    expect(opened.project.displayName).toBe("Example Game 2");
    expect(manager.getActiveProjectId()).toBe("example-game-2");
    expect(manager.getProject()?.name).toBe("example-game-2");
  });
});

describe("createFetchProjectApiClient", () => {
  it("loads project from GET /project", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, project: sample }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createFetchProjectApiClient("/api", fetchImpl as typeof fetch);
    await expect(client.getProject()).resolves.toEqual(sample);
    expect(fetchImpl).toHaveBeenCalledWith("/api/project");
  });

  it("lists and opens projects via catalog endpoints", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/projects") {
        return new Response(
          JSON.stringify({
            ok: true,
            projects: [
              {
                id: "example-game",
                name: sample.name,
                displayName: sample.displayName,
                renderers: sample.renderers,
              },
            ],
            activeProjectId: "example-game",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url === "/api/project/open" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            projectId: "example-game-2",
            project: sampleTwo,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const client = createFetchProjectApiClient("/api", fetchImpl as typeof fetch);
    await expect(client.listProjects()).resolves.toEqual({
      projects: [
        {
          id: "example-game",
          name: sample.name,
          displayName: sample.displayName,
          renderers: sample.renderers,
        },
      ],
      activeProjectId: "example-game",
    });
    await expect(client.openProject("example-game-2")).resolves.toEqual({
      projectId: "example-game-2",
      project: sampleTwo,
    });
  });
});
