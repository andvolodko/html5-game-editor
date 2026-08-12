import { readFile, writeFile, rename } from "node:fs/promises";
import { DomainError, ValidationError } from "@game-editor/core";
import {
  parseProjectData,
  serializeProjectData,
  PROJECT_SCENE_ID_PATTERN,
  type ProjectData,
} from "@game-editor/project";
import type { ProjectService } from "./project-service.js";
import type { SceneFileService } from "./scene-file-service.js";

export const PROJECT_MANIFEST_RELATIVE_PATH = "project.json";

export class ProjectFileService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly sceneFileService: SceneFileService,
  ) {}

  private manifestAbsolute(): string {
    return this.projectService.resolveProjectPath(PROJECT_MANIFEST_RELATIVE_PATH);
  }

  async loadProject(): Promise<ProjectData> {
    const absolute = this.manifestAbsolute();
    let raw: string;
    try {
      raw = await readFile(absolute, "utf8");
    } catch (error) {
      throw new DomainError(
        "PROJECT_NOT_FOUND",
        "project.json not found in project root",
        { cause: error },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new ValidationError("project.json is invalid JSON", { cause: error });
    }

    try {
      return parseProjectData(json);
    } catch (error) {
      throw new ValidationError("project.json failed schema validation", {
        cause: error,
      });
    }
  }

  async saveProject(input: unknown): Promise<ProjectData> {
    let project: ProjectData;
    try {
      project = parseProjectData(input);
    } catch (error) {
      throw new ValidationError("project.json failed schema validation", {
        cause: error,
      });
    }

    await this.assertStartSceneExists(project.startScene);
    return this.writeProject(project);
  }

  async setStartScene(sceneId: string): Promise<ProjectData> {
    if (!PROJECT_SCENE_ID_PATTERN.test(sceneId)) {
      throw new DomainError("INVALID_SCENE_ID", `Invalid scene id: ${sceneId}`);
    }
    await this.assertStartSceneExists(sceneId);
    const project = await this.loadProject();
    if (project.startScene === sceneId) {
      return project;
    }
    return this.writeProject({ ...project, startScene: sceneId });
  }

  /**
   * When a scene file is renamed, keep startScene pointing at the new id.
   * No-ops when project.json is absent (sandbox / incomplete roots).
   */
  async onSceneRenamed(oldId: string, newId: string): Promise<ProjectData | null> {
    if (oldId === newId) {
      return null;
    }
    let project: ProjectData;
    try {
      project = await this.loadProject();
    } catch (error) {
      if (error instanceof DomainError && error.code === "PROJECT_NOT_FOUND") {
        return null;
      }
      throw error;
    }
    if (project.startScene !== oldId) {
      return null;
    }
    return this.writeProject({ ...project, startScene: newId });
  }

  /**
   * When the start scene is deleted, retarget to fallbackSceneId.
   * No-ops when project.json is absent (sandbox / incomplete roots).
   */
  async onSceneDeleted(
    deletedId: string,
    fallbackSceneId: string,
  ): Promise<ProjectData | null> {
    let project: ProjectData;
    try {
      project = await this.loadProject();
    } catch (error) {
      if (error instanceof DomainError && error.code === "PROJECT_NOT_FOUND") {
        return null;
      }
      throw error;
    }
    if (project.startScene !== deletedId) {
      return null;
    }
    if (!PROJECT_SCENE_ID_PATTERN.test(fallbackSceneId)) {
      throw new DomainError(
        "INVALID_SCENE_ID",
        `Invalid scene id: ${fallbackSceneId}`,
      );
    }
    await this.assertStartSceneExists(fallbackSceneId);
    return this.writeProject({ ...project, startScene: fallbackSceneId });
  }

  private async assertStartSceneExists(sceneId: string): Promise<void> {
    const scenes = await this.sceneFileService.listScenes();
    if (!scenes.some((entry) => entry.id === sceneId)) {
      throw new ValidationError(
        `startScene does not exist: ${sceneId}`,
      );
    }
  }

  private async writeProject(project: ProjectData): Promise<ProjectData> {
    const absolute = this.manifestAbsolute();
    const temp = `${absolute}.${process.pid}.${Date.now()}.tmp`;
    const payload = serializeProjectData(project);
    await writeFile(temp, payload, "utf8");
    await rename(temp, absolute);
    return project;
  }
}
