import { readdir, readFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { DomainError, ValidationError } from "@game-editor/core";
import {
  PROJECT_ID_PATTERN,
  parseProjectData,
  type ProjectListEntry,
} from "@game-editor/project";
import type { ProjectService } from "./project-service.js";

const PROJECT_MANIFEST_NAME = "project.json";

/**
 * Discovers and opens games under a fixed games workspace root.
 * Browser clients may only pass allowlisted folder ids — never absolute paths.
 */
export class ProjectCatalogService {
  private readonly gamesRoot: string;

  constructor(
    gamesRoot: string,
    private readonly projectService: ProjectService,
  ) {
    this.gamesRoot = path.resolve(gamesRoot);
  }

  getGamesRoot(): string {
    return this.gamesRoot;
  }

  /**
   * Active project folder id when the open root is a direct child of gamesRoot.
   */
  getActiveProjectId(): string | null {
    const root = this.projectService.getProjectRoot();
    const relative = path.relative(this.gamesRoot, root);
    if (
      relative.length === 0 ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return null;
    }
    const segments = relative.split(path.sep).filter((part) => part.length > 0);
    if (segments.length !== 1) {
      return null;
    }
    const id = segments[0];
    if (id === undefined || !PROJECT_ID_PATTERN.test(id)) {
      return null;
    }
    return id;
  }

  async listProjects(): Promise<ProjectListEntry[]> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = await readdir(this.gamesRoot, { withFileTypes: true });
    } catch (error) {
      throw new DomainError(
        "GAMES_ROOT_NOT_FOUND",
        "Games workspace root is not readable",
        { cause: error },
      );
    }

    const projects: ProjectListEntry[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !PROJECT_ID_PATTERN.test(entry.name)) {
        continue;
      }
      const listed = await this.tryReadListEntry(entry.name);
      if (listed) {
        projects.push(listed);
      }
    }

    projects.sort((a, b) => a.id.localeCompare(b.id));
    return projects;
  }

  /**
   * Switches the active ProjectService root to `games/<id>/`.
   * Returns the opened project id (never an absolute path).
   */
  async openProject(projectId: string): Promise<string> {
    const absolute = await this.resolveProjectRoot(projectId);
    this.projectService.openProject(absolute);
    return projectId;
  }

  /**
   * Resolves an allowlisted project id to an absolute path under gamesRoot.
   */
  async resolveProjectRoot(projectId: string): Promise<string> {
    if (!PROJECT_ID_PATTERN.test(projectId)) {
      throw new ValidationError(`Invalid project id: ${projectId}`);
    }

    const absolute = path.resolve(this.gamesRoot, projectId);
    const rootWithSep = this.gamesRoot.endsWith(path.sep)
      ? this.gamesRoot
      : `${this.gamesRoot}${path.sep}`;
    if (absolute !== this.gamesRoot && !absolute.startsWith(rootWithSep)) {
      throw new DomainError(
        "PATH_ESCAPE",
        `Project id escapes games root: ${projectId}`,
      );
    }
    if (absolute === this.gamesRoot) {
      throw new ValidationError("Project id is required");
    }

    const manifest = path.join(absolute, PROJECT_MANIFEST_NAME);
    try {
      await access(manifest, fsConstants.R_OK);
    } catch (error) {
      throw new DomainError(
        "PROJECT_NOT_FOUND",
        `Project not found: ${projectId}`,
        { cause: error },
      );
    }

    return absolute;
  }

  private async tryReadListEntry(
    projectId: string,
  ): Promise<ProjectListEntry | null> {
    const manifest = path.join(this.gamesRoot, projectId, PROJECT_MANIFEST_NAME);
    let raw: string;
    try {
      raw = await readFile(manifest, "utf8");
    } catch {
      return null;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }

    try {
      const project = parseProjectData(json);
      return {
        id: projectId,
        name: project.name,
        displayName: project.displayName,
        renderers: [...project.renderers],
      };
    } catch {
      return null;
    }
  }
}
