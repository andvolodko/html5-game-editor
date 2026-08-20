import path from "node:path";
import type { ProjectData } from "@game-editor/project";
import type { BuildTargetRegistry } from "./build-target-registry.js";
import { ExecFileProcessRunner } from "./exec-file-process-runner.js";
import type { ProcessRunner } from "./process-runner.js";
import type {
  BuildContext,
  BuildFormat,
  BuildMode,
  BuildPlatform,
  BuildProgressEvent,
  BuildResult,
  BuildType,
} from "./types.js";
import { hasFatalBuildIssues, mergeBuildIssues } from "./types.js";

export interface BuildServiceOptions {
  registry: BuildTargetRegistry;
  processRunner?: ProcessRunner;
  /** Absolute path for generated Android (or other) output under the project. */
  resolveOutputDir?: (args: {
    projectRoot: string;
    platform: BuildPlatform;
  }) => string;
}

export interface BuildRequest {
  projectRoot: string;
  project: ProjectData;
  platform: BuildPlatform;
  mode?: BuildMode;
  format?: BuildFormat;
  buildType?: BuildType;
  onProgress?: (event: BuildProgressEvent) => void;
}

const DEFAULT_MODE: BuildMode = "production";

function defaultFormat(platform: BuildPlatform): BuildFormat {
  return platform === "android" ? "apk" : "web";
}

function defaultBuildType(
  platform: BuildPlatform,
  format: BuildFormat,
  explicit?: BuildType,
): BuildType {
  if (explicit !== undefined) {
    return explicit;
  }
  if (platform === "android" && format === "aab") {
    return "release";
  }
  return "debug";
}

function defaultOutputDir(
  projectRoot: string,
  platform: BuildPlatform,
): string {
  if (platform === "web") {
    return path.join(projectRoot, "dist");
  }
  return path.join(projectRoot, ".build", platform);
}

/**
 * Resolves a build target, validates, and builds. Shared by project-server
 * HTTP and thin CLI scripts.
 */
export class BuildService {
  private readonly registry: BuildTargetRegistry;
  private readonly processRunner: ProcessRunner;
  private readonly resolveOutputDir: (args: {
    projectRoot: string;
    platform: BuildPlatform;
  }) => string;
  private busyProjectRoot: string | null = null;

  constructor(options: BuildServiceOptions) {
    this.registry = options.registry;
    this.processRunner = options.processRunner ?? new ExecFileProcessRunner();
    this.resolveOutputDir =
      options.resolveOutputDir ??
      ((args) => defaultOutputDir(args.projectRoot, args.platform));
  }

  isBusy(): boolean {
    return this.busyProjectRoot !== null;
  }

  getBusyProjectRoot(): string | null {
    return this.busyProjectRoot;
  }

  async build(request: BuildRequest): Promise<BuildResult> {
    if (this.busyProjectRoot !== null) {
      return {
        ok: false,
        artifacts: [],
        issues: [
          {
            severity: "error",
            code: "BUILD_IN_PROGRESS",
            message: `A build is already running for ${this.busyProjectRoot}.`,
          },
        ],
      };
    }

    const platform = request.platform;
    const mode = request.mode ?? DEFAULT_MODE;
    const format = request.format ?? defaultFormat(platform);
    const buildType = defaultBuildType(platform, format, request.buildType);
    const target = this.registry.get(platform);
    if (!target) {
      return {
        ok: false,
        artifacts: [],
        issues: [
          {
            severity: "error",
            code: "UNKNOWN_BUILD_PLATFORM",
            message: `Unknown build platform "${platform}".`,
          },
        ],
      };
    }

    this.busyProjectRoot = request.projectRoot;
    try {
      const context: BuildContext = {
        projectRoot: request.projectRoot,
        project: request.project,
        mode,
        format,
        buildType,
        outputDir: this.resolveOutputDir({
          projectRoot: request.projectRoot,
          platform,
        }),
        processRunner: this.processRunner,
        onProgress: request.onProgress,
      };

      request.onProgress?.({
        stage: "validating",
        message: `Validating ${target.name} build`,
      });
      const validation = await target.validate(context);
      if (hasFatalBuildIssues(validation.issues)) {
        return {
          ok: false,
          artifacts: [],
          issues: validation.issues,
        };
      }

      const result = await target.build(context);
      return {
        ...result,
        issues: mergeBuildIssues(validation.issues, result.issues),
        ok: result.ok && !hasFatalBuildIssues(result.issues),
      };
    } finally {
      this.busyProjectRoot = null;
    }
  }
}
