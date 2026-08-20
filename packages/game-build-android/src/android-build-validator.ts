import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ANDROID_APPLICATION_ID_PATTERN,
  createDefaultAndroidBuildSettings,
  type AndroidBuildSettings,
  type ProjectData,
} from "@game-editor/project";
import type { BuildContext, BuildIssue } from "@game-editor/game-build";
import {
  ANDROID_REQUIRED_JDK_MAJOR,
  ANDROID_TARGET_SDK,
} from "./android-constants.js";
import { locateAndroidSdk, locateJdk } from "./android-toolchain.js";
import {
  isAndroidSigningSecretsComplete,
  loadAndroidSigningSecrets,
} from "./android-signing-secrets.js";

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

export function resolveAndroidSettings(
  project: ProjectData,
): AndroidBuildSettings {
  return (
    project.android ??
    createDefaultAndroidBuildSettings(project.displayName, project.name)
  );
}

function isReleaseBuild(context: BuildContext): boolean {
  return context.buildType === "release" || context.format === "aab";
}

/**
 * Structured Android preflight checks. Does not invoke Gradle.
 */
export class AndroidBuildValidator {
  async validate(context: BuildContext): Promise<BuildIssue[]> {
    const issues: BuildIssue[] = [];
    const settings = resolveAndroidSettings(context.project);
    const release = isReleaseBuild(context);

    if (settings.appName.trim().length === 0) {
      issues.push({
        severity: "error",
        code: "INVALID_APP_NAME",
        message: "Android app name must not be empty.",
      });
    }

    if (!ANDROID_APPLICATION_ID_PATTERN.test(settings.applicationId)) {
      issues.push({
        severity: "error",
        code: "INVALID_APPLICATION_ID",
        message: `Invalid Android application id "${settings.applicationId}". Use reverse-DNS form (e.g. com.example.game).`,
      });
    }

    if (settings.versionName.trim().length === 0) {
      issues.push({
        severity: "error",
        code: "INVALID_VERSION_NAME",
        message: "Android version name must not be empty.",
      });
    }

    if (!Number.isInteger(settings.versionCode) || settings.versionCode < 1) {
      issues.push({
        severity: "error",
        code: "INVALID_VERSION_CODE",
        message: "Android version code must be an integer greater than 0.",
      });
    }

    if (!(await isWritableDir(context.outputDir))) {
      issues.push({
        severity: "error",
        code: "OUTPUT_DIR_NOT_WRITABLE",
        message: `Android output directory is not writable: ${context.outputDir}`,
      });
    }

    const jdk = await locateJdk(context.processRunner);
    if (!jdk.found) {
      issues.push({
        severity: "error",
        code: "JDK_NOT_FOUND",
        message:
          jdk.detail ??
          "Java/JDK was not found on PATH. Install JDK 21 and ensure `java` is available.",
      });
    } else if (
      jdk.majorVersion !== undefined &&
      jdk.majorVersion < ANDROID_REQUIRED_JDK_MAJOR
    ) {
      issues.push({
        severity: "error",
        code: "JDK_NOT_FOUND",
        message: `JDK ${String(ANDROID_REQUIRED_JDK_MAJOR)} or newer is required (found major version ${String(jdk.majorVersion)}). Gradle uses JAVA_HOME; install JDK 21+ or point JAVA_HOME at it. ${jdk.detail ?? ""}`.trim(),
      });
    }

    const sdk = await locateAndroidSdk(process.env, ANDROID_TARGET_SDK);
    if (!sdk.found) {
      issues.push({
        severity: "error",
        code: "ANDROID_SDK_NOT_FOUND",
        message:
          "Android SDK was not found. Set ANDROID_HOME or ANDROID_SDK_ROOT to your SDK path.",
      });
    } else if (!sdk.platformInstalled) {
      issues.push({
        severity: "error",
        code: "ANDROID_PLATFORM_MISSING",
        message:
          sdk.detail ??
          `SDK platform android-${String(ANDROID_TARGET_SDK)} is not installed.`,
      });
    }

    if (context.format === "aab" && context.buildType === "debug") {
      issues.push({
        severity: "error",
        code: "ANDROID_FORMAT_UNSUPPORTED",
        message: 'AAB requires buildType "release".',
      });
    }

    if (!release && context.format === "apk") {
      issues.push({
        severity: "warning",
        code: "ANDROID_DEBUG_UNSIGNED",
        message:
          "Building a debug APK (Gradle assembleDebug) with the debug keystore.",
      });
    }

    if (release) {
      const keystorePath = settings.keystorePath?.trim() ?? "";
      const keyAlias = settings.keyAlias?.trim() ?? "";
      if (keystorePath.length === 0) {
        issues.push({
          severity: "error",
          code: "KEYSTORE_NOT_FOUND",
          message:
            "Release builds require project.android.keystorePath (project-relative path to a .jks/.keystore).",
        });
      } else {
        const absoluteKeystore = path.resolve(
          context.projectRoot,
          keystorePath,
        );
        const root = path.resolve(context.projectRoot);
        const relative = path.relative(root, absoluteKeystore);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          issues.push({
            severity: "error",
            code: "KEYSTORE_NOT_FOUND",
            message: "Keystore path must stay inside the project root.",
          });
        } else if (!(await pathExists(absoluteKeystore))) {
          issues.push({
            severity: "error",
            code: "KEYSTORE_NOT_FOUND",
            message: `Keystore file was not found: ${keystorePath}`,
          });
        }
      }
      if (keyAlias.length === 0) {
        issues.push({
          severity: "error",
          code: "KEY_ALIAS_MISSING",
          message: "Release builds require project.android.keyAlias.",
        });
      }
      try {
        const secrets = await loadAndroidSigningSecrets(context.projectRoot);
        if (!isAndroidSigningSecretsComplete(secrets)) {
          issues.push({
            severity: "error",
            code: "SIGNING_SECRETS_MISSING",
            message:
              "Release builds require .editor/android-secrets.json with keystorePassword and keyPassword (gitignored, local only).",
          });
        }
      } catch (error) {
        issues.push({
          severity: "error",
          code: "SIGNING_SECRETS_MISSING",
          message:
            error instanceof Error
              ? error.message
              : "Failed to read Android signing secrets.",
        });
      }
    }

    if (!settings.iconAssetId) {
      issues.push({
        severity: "warning",
        code: "ANDROID_ICON_MISSING",
        message:
          "No android.iconAssetId set; Capacitor default launcher icon will be used.",
      });
    }
    if (!settings.splashAssetId) {
      issues.push({
        severity: "warning",
        code: "ANDROID_SPLASH_MISSING",
        message:
          "No android.splashAssetId set; default splash background will be used.",
      });
    }

    const packageJson = path.join(context.projectRoot, "package.json");
    try {
      await access(packageJson, constants.F_OK);
    } catch {
      issues.push({
        severity: "error",
        code: "WEB_PACKAGE_JSON_MISSING",
        message: "package.json was not found; web build cannot run.",
      });
    }

    return issues;
  }
}
