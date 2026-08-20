import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "@game-editor/core";
import { ProcessRunError } from "./process-runner.js";
import type {
  BuildContext,
  BuildIssue,
  BuildResult,
  BuildTarget,
  BuildValidationResult,
} from "./types.js";
import { hasFatalBuildIssues } from "./types.js";

export const WEB_BUILD_TARGET_ID = "web";

const VITE_BUILD_ARGS = ["exec", "vite", "build", "--configLoader", "runner"] as const;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isWritableDir(dirPath: string): Promise<boolean> {
  try {
    await mkdir(dirPath, { recursive: true });
    await access(dirPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function pnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

/**
 * Builds a game's production (or development) web bundle via the existing
 * Vite pipeline (`pnpm exec vite build --configLoader runner`).
 */
export class WebBuildTarget implements BuildTarget {
  readonly id = WEB_BUILD_TARGET_ID;
  readonly name = "Web";

  async validate(context: BuildContext): Promise<BuildValidationResult> {
    const issues: BuildIssue[] = [];
    const packageJson = path.join(context.projectRoot, "package.json");
    const viteConfig = path.join(context.projectRoot, "vite.config.ts");
    const distDir = path.join(context.projectRoot, "dist");

    if (!(await pathExists(packageJson))) {
      issues.push({
        severity: "error",
        code: "WEB_PACKAGE_JSON_MISSING",
        message: "package.json was not found in the project root.",
      });
    }
    if (!(await pathExists(viteConfig))) {
      issues.push({
        severity: "error",
        code: "WEB_VITE_CONFIG_MISSING",
        message: "vite.config.ts was not found in the project root.",
      });
    }
    if (!(await isWritableDir(distDir))) {
      issues.push({
        severity: "error",
        code: "OUTPUT_DIR_NOT_WRITABLE",
        message: `Output directory is not writable: ${distDir}`,
      });
    }

    return { issues };
  }

  async build(context: BuildContext): Promise<BuildResult> {
    context.onProgress?.({
      stage: "validating",
      message: "Validating web build prerequisites",
    });
    const { issues } = await this.validate(context);
    if (hasFatalBuildIssues(issues)) {
      return { ok: false, artifacts: [], issues };
    }

    context.onProgress?.({
      stage: "building-web",
      message: "Building web game with Vite",
      progress: 0.2,
    });

    const env: NodeJS.ProcessEnv = {
      ...process.env,
    };
    // Production is the default Vite mode for `vite build`.
    // Development mode uses an explicit --mode for unminified diagnostics.
    const args =
      context.mode === "development"
        ? [...VITE_BUILD_ARGS, "--mode", "development"]
        : [...VITE_BUILD_ARGS];

    try {
      await context.processRunner.run(pnpmCommand(), args, {
        cwd: context.projectRoot,
        env,
      });
    } catch (error) {
      const cause =
        error instanceof ProcessRunError
          ? error.stderr.trim() || error.stdout.trim() || error.message
          : error instanceof Error
            ? error.message
            : String(error);
      issues.push({
        severity: "error",
        code: "WEB_BUILD_FAILED",
        message: `Web build failed.\n\nCommand:\npnpm ${args.join(" ")}\n\nCause:\n${cause}`,
      });
      return { ok: false, artifacts: [], issues };
    }

    const indexHtml = path.join(context.projectRoot, "dist", "index.html");
    if (!(await pathExists(indexHtml))) {
      issues.push({
        severity: "error",
        code: "WEB_BUILD_FAILED",
        message: "Web build finished but dist/index.html was not produced.",
      });
      return { ok: false, artifacts: [], issues };
    }

    context.onProgress?.({
      stage: "finalizing",
      message: "Web build complete",
      progress: 1,
    });

    return {
      ok: true,
      artifacts: [
        {
          type: "web",
          path: path.join(context.projectRoot, "dist"),
        },
      ],
      issues,
    };
  }
}

export function createWebBuildError(
  code: string,
  message: string,
): DomainError {
  return new DomainError(code, message);
}
