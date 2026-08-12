import { access, rename, writeFile, mkdir, readFile, readdir, lstat, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { DomainError, ValidationError } from "@game-editor/core";
import { createEmptyScene, parseSceneData, type SceneData } from "@game-editor/scene";
import type { ProjectService } from "./project-service.js";

export const SCENES_DIR = "assets/scenes";

function assertSafeSceneId(sceneId: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(sceneId)) {
    throw new DomainError("INVALID_SCENE_ID", `Invalid scene id: ${sceneId}`);
  }
}

export interface SceneListEntry {
  id: string;
  path: string;
}

export class SceneFileService {
  constructor(private readonly projectService: ProjectService) {}

  private sceneRelativePath(sceneId: string): string {
    assertSafeSceneId(sceneId);
    return path.join(SCENES_DIR, `${sceneId}.json`);
  }

  /** Lists scene JSON files under assets/scenes/ (id = basename without .json). */
  async listScenes(): Promise<SceneListEntry[]> {
    const absolute = this.projectService.resolveProjectPath(SCENES_DIR);
    try {
      await access(absolute);
    } catch {
      return [];
    }

    const entries = await readdir(absolute, { withFileTypes: true });
    const scenes: SceneListEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const id = entry.name.slice(0, -".json".length);
      if (!/^[A-Za-z0-9._-]+$/.test(id)) {
        continue;
      }
      scenes.push({
        id,
        path: path.posix.join(SCENES_DIR, entry.name),
      });
    }
    scenes.sort((a, b) => a.id.localeCompare(b.id));
    return scenes;
  }

  async loadScene(sceneId: string): Promise<SceneData> {
    const absolute = this.projectService.resolveProjectPath(
      this.sceneRelativePath(sceneId),
    );

    let raw: string;
    try {
      raw = await readFile(absolute, "utf8");
    } catch (error) {
      throw new DomainError("SCENE_NOT_FOUND", `Scene not found: ${sceneId}`, {
        cause: error,
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new ValidationError(`Scene JSON is invalid: ${sceneId}`, { cause: error });
    }

    try {
      return parseSceneData(json);
    } catch (error) {
      throw new ValidationError(`Scene failed schema validation: ${sceneId}`, {
        cause: error,
      });
    }
  }

  async saveScene(sceneId: string, input: unknown): Promise<SceneData> {
    const validated = parseSceneData(input);
    const relative = this.sceneRelativePath(sceneId);
    const absolute = this.projectService.resolveProjectPath(relative);
    const tempAbsolute = `${absolute}.${process.pid}.${Date.now()}.tmp`;

    await mkdir(path.dirname(absolute), { recursive: true });
    const payload = `${JSON.stringify(validated, null, 2)}\n`;
    await writeFile(tempAbsolute, payload, "utf8");
    await rename(tempAbsolute, absolute);
    return validated;
  }

  async createScene(sceneId: string, name?: string): Promise<SceneData> {
    assertSafeSceneId(sceneId);
    const relative = this.sceneRelativePath(sceneId);
    const absolute = this.projectService.resolveProjectPath(relative);

    try {
      await access(absolute);
      throw new DomainError(
        "SCENE_ALREADY_EXISTS",
        `Scene already exists: ${sceneId}`,
      );
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      // File does not exist — proceed.
    }

    const scene = createEmptyScene(name ?? sceneId);
    return this.saveScene(sceneId, scene);
  }

  /**
   * Renames a scene file on disk (`assets/scenes/<id>.json`).
   * Does not rewrite scene document `name` — that is a separate edit.
   */
  async renameScene(sceneId: string, newSceneId: string): Promise<SceneListEntry> {
    assertSafeSceneId(sceneId);
    assertSafeSceneId(newSceneId);

    if (sceneId === newSceneId) {
      return {
        id: sceneId,
        path: path.posix.join(SCENES_DIR, `${sceneId}.json`),
      };
    }

    const fromRelative = this.sceneRelativePath(sceneId);
    const toRelative = this.sceneRelativePath(newSceneId);
    const fromAbsolute = this.projectService.resolveProjectPath(fromRelative);
    const toAbsolute = this.projectService.resolveProjectPath(toRelative);

    try {
      await access(fromAbsolute);
    } catch (error) {
      throw new DomainError("SCENE_NOT_FOUND", `Scene not found: ${sceneId}`, {
        cause: error,
      });
    }

    try {
      await access(toAbsolute);
      throw new DomainError(
        "SCENE_ALREADY_EXISTS",
        `Scene already exists: ${newSceneId}`,
      );
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      // Destination missing — proceed.
    }

    await rename(fromAbsolute, toAbsolute);
    return {
      id: newSceneId,
      path: path.posix.join(SCENES_DIR, `${newSceneId}.json`),
    };
  }

  /**
   * Deletes `assets/scenes/<id>.json` only. Refuses the last remaining scene.
   */
  async deleteScene(sceneId: string): Promise<void> {
    assertSafeSceneId(sceneId);
    const scenes = await this.listScenes();
    if (scenes.length <= 1) {
      throw new DomainError(
        "LAST_SCENE",
        "Cannot remove the last scene in the project",
      );
    }
    if (!scenes.some((entry) => entry.id === sceneId)) {
      throw new DomainError("SCENE_NOT_FOUND", `Scene not found: ${sceneId}`);
    }

    const relative = this.sceneRelativePath(sceneId);
    const absolute = this.projectService.resolveProjectPath(relative);
    const scenesRootAbsolute = this.projectService.resolveProjectPath(SCENES_DIR);

    let stats;
    try {
      stats = await lstat(absolute);
    } catch (error) {
      throw new DomainError("SCENE_NOT_FOUND", `Scene not found: ${sceneId}`, {
        cause: error,
      });
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to delete a symbolic link");
    }
    if (!stats.isFile()) {
      throw new ValidationError(`Not a scene file: ${sceneId}`);
    }

    const realAbsolute = await realpath(absolute);
    const realScenesRoot = await realpath(scenesRootAbsolute);
    const rootWithSep = realScenesRoot.endsWith(path.sep)
      ? realScenesRoot
      : `${realScenesRoot}${path.sep}`;
    if (!realAbsolute.startsWith(rootWithSep)) {
      throw new DomainError(
        "PATH_ESCAPE",
        `Refusing to delete path outside assets/scenes: ${sceneId}`,
      );
    }

    await rm(realAbsolute);
  }
}
