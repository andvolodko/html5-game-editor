import { access, constants, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProcessRunner } from "@game-editor/game-build";
import { ProcessRunError } from "@game-editor/game-build";
import type { AndroidBuildSettings } from "@game-editor/project";
import { withAaptAllowGeneratedAssets } from "./android-aapt-assets.js";
import {
  ANDROID_COMPILE_SDK,
  ANDROID_MIN_SDK,
  ANDROID_TARGET_SDK,
} from "./android-constants.js";
import { orientationManifestValue } from "./android-project-generator.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function pnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

const CAPACITOR_CLI_RELATIVE = path.join(
  "node_modules",
  "@capacitor",
  "cli",
  "bin",
  "capacitor",
);

/**
 * Run the generated project's `@capacitor/cli` with Node. `npx cap` / `pnpm exec cap`
 * fail on Windows (npx looks up package "cap"; cmd.exe does not find `cap` without .cmd).
 */
export function capacitorCliInvocation(
  projectDir: string,
  args: readonly string[],
): { command: string; args: string[] } {
  return {
    command: process.execPath,
    args: [path.join(projectDir, CAPACITOR_CLI_RELATIVE), ...args],
  };
}

export class CapacitorSync {
  constructor(private readonly processRunner: ProcessRunner) {}

  async installDependencies(projectDir: string): Promise<void> {
    try {
      // .build/android sits under the monorepo; without --ignore-workspace
      // pnpm install would install the workspace root and skip this package.json.
      await this.processRunner.run(
        pnpmCommand(),
        ["install", "--ignore-workspace"],
        { cwd: projectDir },
      );
    } catch (error) {
      throw wrapCapacitorError(
        "CAPACITOR_SYNC_FAILED",
        "pnpm install --ignore-workspace",
        error,
      );
    }
  }

  async ensureAndroidPlatform(projectDir: string): Promise<void> {
    const androidDir = path.join(projectDir, "android");
    if (await pathExists(androidDir)) {
      return;
    }
    await this.runCapacitor(projectDir, ["add", "android"]);
  }

  async sync(projectDir: string): Promise<void> {
    await this.runCapacitor(projectDir, ["sync", "android"]);
  }

  private async runCapacitor(
    projectDir: string,
    args: readonly string[],
  ): Promise<void> {
    const cli = path.join(projectDir, CAPACITOR_CLI_RELATIVE);
    if (!(await pathExists(cli))) {
      throw wrapCapacitorError(
        "CAPACITOR_SYNC_FAILED",
        `node ${CAPACITOR_CLI_RELATIVE} ${args.join(" ")}`,
        new Error(
          `Capacitor CLI was not found at ${cli}. pnpm install --ignore-workspace may have failed.`,
        ),
      );
    }
    const invocation = capacitorCliInvocation(projectDir, args);
    try {
      await this.processRunner.run(invocation.command, invocation.args, {
        cwd: projectDir,
      });
    } catch (error) {
      throw wrapCapacitorError(
        "CAPACITOR_SYNC_FAILED",
        `node ${CAPACITOR_CLI_RELATIVE} ${args.join(" ")}`,
        error,
      );
    }
  }
}

function wrapCapacitorError(
  code: string,
  command: string,
  error: unknown,
): Error {
  const cause =
    error instanceof ProcessRunError
      ? error.stderr.trim() || error.stdout.trim() || error.message
      : error instanceof Error
        ? error.message
        : String(error);
  const wrapped = new Error(
    `Android build failed during Capacitor step.\n\nCommand:\n${command}\n\nCause:\n${cause}`,
  );
  (wrapped as Error & { code?: string }).code = code;
  return wrapped;
}

/**
 * Apply project Android settings onto the generated Capacitor Android tree
 * (SDK levels, version, orientation, flags).
 */
export async function applyAndroidProjectSettings(
  androidProjectDir: string,
  settings: AndroidBuildSettings,
): Promise<void> {
  const appBuildGradle = path.join(androidProjectDir, "app", "build.gradle");
  if (await pathExists(appBuildGradle)) {
    let gradle = await readFile(appBuildGradle, "utf8");
    gradle = replaceOrInsertSdk(gradle, "compileSdk", ANDROID_COMPILE_SDK);
    gradle = replaceOrInsertSdk(gradle, "compileSdkVersion", ANDROID_COMPILE_SDK);
    gradle = replaceGradleAssignment(gradle, "minSdkVersion", ANDROID_MIN_SDK);
    gradle = replaceGradleAssignment(gradle, "targetSdkVersion", ANDROID_TARGET_SDK);
    gradle = replaceGradleAssignment(gradle, "versionCode", settings.versionCode);
    gradle = replaceGradleQuoted(gradle, "versionName", settings.versionName);
    gradle = replaceGradleQuoted(gradle, "applicationId", settings.applicationId);
    gradle = replaceGradleQuoted(gradle, "namespace", settings.applicationId);
    gradle = withAaptAllowGeneratedAssets(gradle);
    await writeFile(appBuildGradle, gradle, "utf8");
  }

  const variablesGradle = path.join(androidProjectDir, "variables.gradle");
  if (await pathExists(variablesGradle)) {
    let variables = await readFile(variablesGradle, "utf8");
    variables = replaceGradleAssignment(variables, "minSdkVersion", ANDROID_MIN_SDK);
    variables = replaceGradleAssignment(
      variables,
      "compileSdkVersion",
      ANDROID_COMPILE_SDK,
    );
    variables = replaceGradleAssignment(
      variables,
      "targetSdkVersion",
      ANDROID_TARGET_SDK,
    );
    await writeFile(variablesGradle, variables, "utf8");
  }

  const manifestPath = path.join(
    androidProjectDir,
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  if (await pathExists(manifestPath)) {
    let manifest = await readFile(manifestPath, "utf8");
    const orientation = orientationManifestValue(settings.orientation);
    if (/android:screenOrientation="[^"]*"/.test(manifest)) {
      manifest = manifest.replace(
        /android:screenOrientation="[^"]*"/,
        `android:screenOrientation="${orientation}"`,
      );
    } else {
      manifest = manifest.replace(
        "<activity",
        `<activity\n            android:screenOrientation="${orientation}"`,
      );
    }

    if (settings.fullscreen || settings.immersiveMode) {
      if (!manifest.includes("android:theme=")) {
        manifest = manifest.replace(
          "<activity",
          `<activity\n            android:theme="@style/AppTheme.NoActionBarLaunch"`,
        );
      }
    }

    if (settings.keepScreenAwake) {
      if (!manifest.includes("android.permission.WAKE_LOCK")) {
        manifest = manifest.replace(
          "<manifest",
          `<manifest\n    xmlns:tools="http://schemas.android.com/tools"`,
        );
        // Insert uses-permission after opening manifest tag content starts
        if (!/uses-permission[^>]*WAKE_LOCK/.test(manifest)) {
          manifest = manifest.replace(
            /(<manifest[^>]*>)/,
            `$1\n    <uses-permission android:name="android.permission.WAKE_LOCK" />`,
          );
        }
      }
    }

    await writeFile(manifestPath, manifest, "utf8");
  }

  const stringsPath = path.join(
    androidProjectDir,
    "app",
    "src",
    "main",
    "res",
    "values",
    "strings.xml",
  );
  if (await pathExists(stringsPath)) {
    let strings = await readFile(stringsPath, "utf8");
    strings = strings.replace(
      /<string name="app_name">[^<]*<\/string>/,
      `<string name="app_name">${escapeXml(settings.appName)}</string>`,
    );
    strings = strings.replace(
      /<string name="title_activity_main">[^<]*<\/string>/,
      `<string name="title_activity_main">${escapeXml(settings.appName)}</string>`,
    );
    strings = strings.replace(
      /<string name="package_name">[^<]*<\/string>/,
      `<string name="package_name">${escapeXml(settings.applicationId)}</string>`,
    );
    strings = strings.replace(
      /<string name="custom_url_scheme">[^<]*<\/string>/,
      `<string name="custom_url_scheme">${escapeXml(settings.applicationId)}</string>`,
    );
    await writeFile(stringsPath, strings, "utf8");
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function replaceGradleAssignment(
  source: string,
  key: string,
  value: number,
): string {
  const pattern = new RegExp(`(${key}\\s*=\\s*)\\d+`);
  if (pattern.test(source)) {
    return source.replace(pattern, `$1${String(value)}`);
  }
  return source;
}

function replaceOrInsertSdk(
  source: string,
  key: string,
  value: number,
): string {
  return replaceGradleAssignment(source, key, value);
}

function replaceGradleQuoted(
  source: string,
  key: string,
  value: string,
): string {
  const pattern = new RegExp(`(${key}\\s+)"[^"]*"`);
  if (pattern.test(source)) {
    return source.replace(pattern, `$1"${value}"`);
  }
  const assignPattern = new RegExp(`(${key}\\s*=\\s*)"[^"]*"`);
  if (assignPattern.test(source)) {
    return source.replace(assignPattern, `$1"${value}"`);
  }
  return source;
}
