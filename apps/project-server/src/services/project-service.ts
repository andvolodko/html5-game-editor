import { ProjectRootGuard } from "./project-root-guard.js";

/**
 * Project/filesystem façade. Concrete file APIs will be added later;
 * all of them must go through ProjectRootGuard.
 */
export class ProjectService {
  private guard: ProjectRootGuard;

  constructor(projectRoot = process.cwd()) {
    this.guard = new ProjectRootGuard(projectRoot);
  }

  getProjectRoot(): string {
    return this.guard.getRoot();
  }

  /**
   * Placeholder for opening a project. Does not expose arbitrary FS access.
   */
  openProject(projectRoot: string): void {
    this.guard = new ProjectRootGuard(projectRoot);
  }

  /** Safe path resolution entry point for future FS endpoints. */
  resolveProjectPath(relativePath: string): string {
    return this.guard.resolveSafe(relativePath);
  }
}
