import path from "node:path";
import { DomainError } from "@game-editor/core";

/**
 * Future filesystem operations must resolve through this guard so paths
 * cannot escape the active project root (no unrestricted FS API).
 */
export class ProjectRootGuard {
  private readonly root: string;

  constructor(projectRoot: string) {
    this.root = path.resolve(projectRoot);
  }

  getRoot(): string {
    return this.root;
  }

  /**
   * Resolves a project-relative path and rejects traversal outside the root.
   */
  resolveSafe(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^([/\\])+/, "");
    const absolute = path.resolve(this.root, normalized);
    const rootWithSep = this.root.endsWith(path.sep)
      ? this.root
      : `${this.root}${path.sep}`;

    if (absolute !== this.root && !absolute.startsWith(rootWithSep)) {
      throw new DomainError(
        "PATH_ESCAPE",
        `Path escapes project root: ${relativePath}`,
      );
    }

    return absolute;
  }
}
