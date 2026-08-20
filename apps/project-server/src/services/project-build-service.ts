import path from "node:path";
import { DomainError, ValidationError } from "@game-editor/core";
import type {
  BuildFormat,
  BuildMode,
  BuildPlatform,
  BuildProgressEvent,
  BuildResult,
  BuildService,
  BuildType,
} from "@game-editor/game-build";
import { ExecFileProcessRunner } from "@game-editor/game-build";
import {
  generateLocalUploadKeystore,
  isAndroidSigningSecretsComplete,
  loadAndroidSigningSecrets,
  saveAndroidSigningSecrets,
  type AndroidSigningSecrets,
  type GenerateLocalKeystoreResult,
} from "@game-editor/game-build-android";
import { openInFileManager } from "./open-in-file-manager.js";
import type { ProjectFileService } from "./project-file-service.js";
import type { ProjectService } from "./project-service.js";

const ALLOWED_PLATFORMS = new Set<BuildPlatform>(["web", "android"]);
const ALLOWED_MODES = new Set<BuildMode>(["development", "production"]);
const ALLOWED_FORMATS = new Set<BuildFormat>(["web", "apk", "aab"]);
const ALLOWED_BUILD_TYPES = new Set<BuildType>(["debug", "release"]);

export interface BuildRequestBody {
  platform: BuildPlatform;
  mode?: BuildMode;
  format?: BuildFormat;
  buildType?: BuildType;
}

export interface ProjectRelativeBuildResult extends Omit<BuildResult, "artifacts" | "logPath"> {
  artifacts: Array<{
    type: BuildResult["artifacts"][number]["type"];
    path: string;
    absolutePath: string;
  }>;
  logPath?: string;
  logAbsolutePath?: string;
}

/**
 * Allowlisted build orchestration for the editor. Never exposes a shell.
 */
export class ProjectBuildService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectFileService: ProjectFileService,
    private readonly buildService: BuildService,
  ) {}

  parseRequest(body: unknown): BuildRequestBody {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ValidationError("Expected build request object");
    }
    const record = body as Record<string, unknown>;
    const platform = record.platform;
    if (typeof platform !== "string" || !ALLOWED_PLATFORMS.has(platform as BuildPlatform)) {
      throw new ValidationError(
        'platform must be "web" or "android"',
      );
    }
    const mode =
      record.mode === undefined
        ? "production"
        : typeof record.mode === "string" &&
            ALLOWED_MODES.has(record.mode as BuildMode)
          ? (record.mode as BuildMode)
          : undefined;
    if (mode === undefined) {
      throw new ValidationError(
        'mode must be "development" or "production"',
      );
    }
    let buildType: BuildType | undefined =
      record.buildType === undefined
        ? undefined
        : typeof record.buildType === "string" &&
            ALLOWED_BUILD_TYPES.has(record.buildType as BuildType)
          ? (record.buildType as BuildType)
          : undefined;
    if (record.buildType !== undefined && buildType === undefined) {
      throw new ValidationError('buildType must be "debug" or "release"');
    }

    const format =
      record.format === undefined
        ? platform === "android"
          ? buildType === "release"
            ? "aab"
            : "apk"
          : "web"
        : typeof record.format === "string" &&
            ALLOWED_FORMATS.has(record.format as BuildFormat)
          ? (record.format as BuildFormat)
          : undefined;
    if (format === undefined) {
      throw new ValidationError('format must be "web", "apk", or "aab"');
    }
    if (platform === "web" && format !== "web") {
      throw new ValidationError('Web builds only support format "web"');
    }
    if (platform === "android" && format === "web") {
      throw new ValidationError(
        'Android builds require format "apk" or "aab"',
      );
    }
    if (buildType === undefined) {
      buildType = format === "aab" ? "release" : "debug";
    }
    if (format === "aab" && buildType === "debug") {
      throw new ValidationError('AAB requires buildType "release"');
    }
    return {
      platform: platform as BuildPlatform,
      mode,
      format,
      buildType,
    };
  }

  async run(
    request: BuildRequestBody,
    onProgress?: (event: BuildProgressEvent) => void,
  ): Promise<ProjectRelativeBuildResult> {
    const projectRoot = this.projectService.getProjectRoot();
    const project = await this.projectFileService.loadProject();
    const result = await this.buildService.build({
      projectRoot,
      project,
      platform: request.platform,
      mode: request.mode,
      format: request.format,
      buildType: request.buildType,
      onProgress,
    });
    return this.toProjectRelative(result, projectRoot);
  }

  toProjectRelative(
    result: BuildResult,
    projectRoot: string,
  ): ProjectRelativeBuildResult {
    const root = path.resolve(projectRoot);
    const relativize = (absolute: string): string => {
      const resolved = path.resolve(absolute);
      const relative = path.relative(root, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new DomainError(
          "PATH_ESCAPE",
          "Build artifact path escaped project root",
        );
      }
      return relative.split(path.sep).join("/");
    };
    return {
      ok: result.ok,
      issues: result.issues,
      artifacts: result.artifacts.map((artifact) => {
        const absolutePath = path.resolve(artifact.path);
        return {
          type: artifact.type,
          path: relativize(absolutePath),
          absolutePath,
        };
      }),
      ...(result.logPath !== undefined
        ? {
            logPath: relativize(path.resolve(result.logPath)),
            logAbsolutePath: path.resolve(result.logPath),
          }
        : {}),
    };
  }

  async revealPath(projectRelativePath: string): Promise<void> {
    if (
      typeof projectRelativePath !== "string" ||
      projectRelativePath.trim().length === 0
    ) {
      throw new ValidationError("Expected { path: string }");
    }
    const absolute = this.projectService.resolveProjectPath(
      projectRelativePath,
    );
    await openInFileManager(absolute);
  }

  /**
   * Returns whether local signing secrets exist (never returns password values).
   */
  async getAndroidSecretsStatus(): Promise<{ configured: boolean }> {
    const secrets = await loadAndroidSigningSecrets(
      this.projectService.getProjectRoot(),
    );
    return { configured: isAndroidSigningSecretsComplete(secrets) };
  }

  async saveAndroidSecrets(secrets: AndroidSigningSecrets): Promise<void> {
    if (
      typeof secrets.keystorePassword !== "string" ||
      typeof secrets.keyPassword !== "string" ||
      secrets.keystorePassword.length === 0 ||
      secrets.keyPassword.length === 0
    ) {
      throw new ValidationError(
        "Expected { keystorePassword: string, keyPassword: string }",
      );
    }
    await saveAndroidSigningSecrets(this.projectService.getProjectRoot(), {
      keystorePassword: secrets.keystorePassword,
      keyPassword: secrets.keyPassword,
    });
  }

  async generateLocalKeystore(): Promise<GenerateLocalKeystoreResult> {
    const projectRoot = this.projectService.getProjectRoot();
    const project = await this.projectFileService.loadProject();
    try {
      return await generateLocalUploadKeystore({
        projectRoot,
        processRunner: new ExecFileProcessRunner(),
        distinguishedName: `CN=${project.displayName}, OU=Local, O=GameEditor, C=US`,
      });
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : "SIGNING_FAILED";
      throw new DomainError(
        code,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

