import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  hasFatalBuildIssues,
  WebBuildTarget,
  type BuildContext,
  type BuildIssue,
  type BuildResult,
  type BuildTarget,
} from "@game-editor/game-build";
import {
  ANDROID_BUILD_TARGET_ID,
  ANDROID_LOG_FILE_NAME,
} from "./android-constants.js";
import {
  AndroidBuildValidator,
  resolveAndroidSettings,
} from "./android-build-validator.js";
import { AndroidProjectGenerator } from "./android-project-generator.js";
import { AndroidGradleBuilder } from "./android-gradle-builder.js";
import {
  applyAndroidProjectSettings,
  CapacitorSync,
} from "./capacitor-sync.js";
import { applyAndroidBranding } from "./android-branding-generator.js";
import {
  isAndroidSigningSecretsComplete,
  loadAndroidSigningSecrets,
} from "./android-signing-secrets.js";
import { applyReleaseSigningConfig } from "./android-signing-config.js";

export class AndroidBuildTarget implements BuildTarget {
  readonly id = ANDROID_BUILD_TARGET_ID;
  readonly name = "Android";

  private readonly validator = new AndroidBuildValidator();
  private readonly generator = new AndroidProjectGenerator();
  private readonly webTarget = new WebBuildTarget();

  async validate(context: BuildContext): Promise<{ issues: BuildIssue[] }> {
    const issues = await this.validator.validate(context);
    return { issues };
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const issues: BuildIssue[] = [];
    const logPath = path.join(context.outputDir, ANDROID_LOG_FILE_NAME);
    await mkdir(context.outputDir, { recursive: true });
    await writeFile(logPath, "", "utf8");

    const log = async (line: string): Promise<void> => {
      await appendFile(logPath, `${line}\n`, "utf8");
    };

    context.onProgress?.({
      stage: "validating",
      message: "Validating Android project",
    });
    const validation = await this.validate(context);
    issues.push(...validation.issues);
    if (hasFatalBuildIssues(issues)) {
      await log(
        issues.map((i) => `${i.severity}:${i.code}: ${i.message}`).join("\n"),
      );
      return { ok: false, artifacts: [], issues, logPath };
    }

    context.onProgress?.({
      stage: "building-web",
      message: "Building Web game",
      progress: 0.15,
    });
    const webResult = await this.webTarget.build({
      ...context,
      format: "web",
      mode: "production",
      buildType: "debug",
      outputDir: path.join(context.projectRoot, "dist"),
      onProgress: undefined,
    });
    issues.push(...webResult.issues);
    await log(
      webResult.ok
        ? "Web build succeeded"
        : `Web build failed: ${webResult.issues.map((i) => i.message).join("; ")}`,
    );
    if (!webResult.ok || hasFatalBuildIssues(webResult.issues)) {
      issues.push({
        severity: "error",
        code: "WEB_BUILD_FAILED",
        message: "Web production build failed; Android packaging aborted.",
      });
      return { ok: false, artifacts: [], issues, logPath };
    }

    const webDist =
      webResult.artifacts.find((a) => a.type === "web")?.path ??
      path.join(context.projectRoot, "dist");
    const settings = resolveAndroidSettings(context.project);
    const androidProjectDir = path.join(context.outputDir, "android");
    const release =
      context.buildType === "release" || context.format === "aab";

    context.onProgress?.({
      stage: "preparing-android",
      message: "Preparing Android project",
      progress: 0.35,
    });
    try {
      await this.generator.generate({
        outputDir: context.outputDir,
        webDistDir: webDist,
        settings,
      });
      await log("Android project generated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        severity: "error",
        code: "CAPACITOR_SYNC_FAILED",
        message: `Failed to prepare Android project.\n\nCause:\n${message}`,
      });
      await log(message);
      return { ok: false, artifacts: [], issues, logPath };
    }

    const capacitor = new CapacitorSync(context.processRunner);
    context.onProgress?.({
      stage: "syncing-capacitor",
      message: "Synchronizing Capacitor",
      progress: 0.55,
    });
    try {
      await capacitor.installDependencies(context.outputDir);
      await capacitor.ensureAndroidPlatform(context.outputDir);
      await capacitor.sync(context.outputDir);
      await applyAndroidProjectSettings(androidProjectDir, settings);
      await log("Capacitor sync complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        severity: "error",
        code: "CAPACITOR_SYNC_FAILED",
        message,
      });
      await log(message);
      return { ok: false, artifacts: [], issues, logPath };
    }

    const branding = await applyAndroidBranding({
      projectRoot: context.projectRoot,
      androidProjectDir,
      settings,
    });
    issues.push(...branding.issues);
    if (branding.issues.length === 0 && (settings.iconAssetId || settings.splashAssetId)) {
      await log("Branding resources applied");
    }

    if (release) {
      try {
        const secrets = await loadAndroidSigningSecrets(context.projectRoot);
        if (!isAndroidSigningSecretsComplete(secrets)) {
          issues.push({
            severity: "error",
            code: "SIGNING_SECRETS_MISSING",
            message: "Signing secrets missing at release time.",
          });
          return { ok: false, artifacts: [], issues, logPath };
        }
        await applyReleaseSigningConfig({
          androidProjectDir,
          projectRoot: context.projectRoot,
          settings,
          secrets,
        });
        await log("Release signing config applied");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          severity: "error",
          code: "SIGNING_FAILED",
          message,
        });
        await log("Signing config failed");
        return { ok: false, artifacts: [], issues, logPath };
      }
    }

    const gradle = new AndroidGradleBuilder(context.processRunner);
    const taskHint =
      context.format === "aab"
        ? "bundleRelease"
        : release
          ? "assembleRelease"
          : "assembleDebug";
    context.onProgress?.({
      stage: "running-gradle",
      message: `Running Gradle ${taskHint}`,
      progress: 0.75,
    });

    let artifact: { type: "apk" | "aab"; path: string; task: string };
    try {
      artifact = await gradle.buildArtifact(
        androidProjectDir,
        context.buildType,
        context.format === "aab" ? "aab" : "apk",
      );
      await log(`${artifact.type.toUpperCase()} produced: ${artifact.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        (error as { code?: string }).code === "SIGNING_FAILED"
          ? "SIGNING_FAILED"
          : "GRADLE_BUILD_FAILED";
      issues.push({
        severity: "error",
        code,
        message,
      });
      await log(message);
      return { ok: false, artifacts: [], issues, logPath };
    }

    context.onProgress?.({
      stage: "finalizing",
      message: "Finalizing artifact",
      progress: 1,
    });

    return {
      ok: !hasFatalBuildIssues(issues),
      artifacts: [{ type: artifact.type, path: artifact.path }],
      issues,
      logPath,
    };
  }
}
