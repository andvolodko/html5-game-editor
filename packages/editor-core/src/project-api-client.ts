import type { ProjectData, ProjectListEntry } from "@game-editor/project";

export interface ProjectListResult {
  projects: ProjectListEntry[];
  activeProjectId: string | null;
}

export interface OpenProjectResult {
  projectId: string;
  project: ProjectData;
}

export interface ProjectApiClient {
  getProject(): Promise<ProjectData>;
  saveProject(project: ProjectData): Promise<ProjectData>;
  listProjects(): Promise<ProjectListResult>;
  openProject(projectId: string): Promise<OpenProjectResult>;
}

export function createFetchProjectApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ProjectApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async getProject() {
      const response = await fetchImpl(`${root}/project`);
      const payload = (await response.json()) as {
        ok: boolean;
        project?: ProjectData;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.project === undefined) {
        throw new Error(
          payload.message ?? `Load project failed (${String(response.status)})`,
        );
      }
      return payload.project;
    },

    async saveProject(project) {
      const response = await fetchImpl(`${root}/project`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(project),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        project?: ProjectData;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.project === undefined) {
        throw new Error(
          payload.message ?? `Save project failed (${String(response.status)})`,
        );
      }
      return payload.project;
    },

    async listProjects() {
      const response = await fetchImpl(`${root}/projects`);
      const payload = (await response.json()) as {
        ok: boolean;
        projects?: ProjectListEntry[];
        activeProjectId?: string | null;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.projects === undefined) {
        throw new Error(
          payload.message ?? `List projects failed (${String(response.status)})`,
        );
      }
      return {
        projects: payload.projects,
        activeProjectId: payload.activeProjectId ?? null,
      };
    },

    async openProject(projectId) {
      const response = await fetchImpl(`${root}/project/open`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        projectId?: string;
        project?: ProjectData;
        message?: string;
      };
      if (
        !response.ok ||
        !payload.ok ||
        payload.project === undefined ||
        payload.projectId === undefined
      ) {
        throw new Error(
          payload.message ?? `Open project failed (${String(response.status)})`,
        );
      }
      return {
        projectId: payload.projectId,
        project: payload.project,
      };
    },
  };
}
