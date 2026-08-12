import type { ProjectData, ProjectListEntry } from "@game-editor/project";
import type {
  OpenProjectResult,
  ProjectApiClient,
  ProjectListResult,
} from "./project-api-client.js";

export type ProjectManagerStatus = "idle" | "loading" | "saving" | "error";

type Listener = () => void;

/**
 * Editor-owned cache of project.json. Not on the scene undo stack.
 */
export class ProjectManager {
  private project: ProjectData | null = null;
  private activeProjectId: string | null = null;
  private status: ProjectManagerStatus = "idle";
  private error: string | undefined;
  private revision = 0;
  private readonly listeners = new Set<Listener>();

  constructor(private api: ProjectApiClient | undefined) {}

  setApi(api: ProjectApiClient): void {
    this.api = api;
  }

  getProject(): ProjectData | null {
    return this.project;
  }

  getActiveProjectId(): string | null {
    return this.activeProjectId;
  }

  getStatus(): ProjectManagerStatus {
    return this.status;
  }

  getError(): string | undefined {
    return this.error;
  }

  getRevision(): number {
    return this.revision;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async refresh(): Promise<ProjectData> {
    if (!this.api) {
      throw new Error("Project API is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const [project, listed] = await Promise.all([
        this.api.getProject(),
        this.api.listProjects().catch(() => null),
      ]);
      this.project = project;
      if (listed) {
        this.activeProjectId = listed.activeProjectId;
      }
      this.status = "idle";
      this.revision += 1;
      this.emit();
      return project;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Failed to load project";
      this.emit();
      throw error;
    }
  }

  async listProjects(): Promise<ProjectListEntry[]> {
    if (!this.api) {
      throw new Error("Project API is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const result: ProjectListResult = await this.api.listProjects();
      this.activeProjectId = result.activeProjectId;
      this.status = "idle";
      this.revision += 1;
      this.emit();
      return result.projects;
    } catch (error) {
      this.status = "error";
      this.error =
        error instanceof Error ? error.message : "Failed to list projects";
      this.emit();
      throw error;
    }
  }

  /**
   * Switches the server active project and updates the local project cache.
   * Caller is responsible for reloading assets and the start scene.
   */
  async openProject(projectId: string): Promise<OpenProjectResult> {
    if (!this.api) {
      throw new Error("Project API is not configured");
    }
    this.status = "loading";
    this.error = undefined;
    this.emit();
    try {
      const opened = await this.api.openProject(projectId);
      this.project = opened.project;
      this.activeProjectId = opened.projectId;
      this.status = "idle";
      this.revision += 1;
      this.emit();
      return opened;
    } catch (error) {
      this.status = "error";
      this.error =
        error instanceof Error ? error.message : "Failed to open project";
      this.emit();
      throw error;
    }
  }

  async setStartScene(sceneId: string): Promise<ProjectData> {
    if (!this.api) {
      throw new Error("Project API is not configured");
    }
    const current = this.project ?? (await this.refresh());
    if (current.startScene === sceneId) {
      return current;
    }
    this.status = "saving";
    this.error = undefined;
    this.emit();
    try {
      const saved = await this.api.saveProject({
        ...current,
        startScene: sceneId,
      });
      this.project = saved;
      this.status = "idle";
      this.revision += 1;
      this.emit();
      return saved;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Failed to save project";
      this.emit();
      throw error;
    }
  }

  async setResolution(width: number, height: number): Promise<ProjectData> {
    if (!this.api) {
      throw new Error("Project API is not configured");
    }
    const current = this.project ?? (await this.refresh());
    if (
      current.resolution.width === width &&
      current.resolution.height === height
    ) {
      return current;
    }
    this.status = "saving";
    this.error = undefined;
    this.emit();
    try {
      const saved = await this.api.saveProject({
        ...current,
        resolution: { width, height },
      });
      this.project = saved;
      this.status = "idle";
      this.revision += 1;
      this.emit();
      return saved;
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : "Failed to save project";
      this.emit();
      throw error;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
