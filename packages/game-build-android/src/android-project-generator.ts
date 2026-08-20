import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AndroidBuildSettings } from "@game-editor/project";
import {
  ANDROID_COMPILE_SDK,
  ANDROID_MIN_SDK,
  ANDROID_TARGET_SDK,
  ANDROID_WEB_DIR,
  CAPACITOR_VERSION,
} from "./android-constants.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ANDROID_TEMPLATE_ROOT = path.resolve(here, "../templates/capacitor-android");

export interface AndroidProjectGenerateOptions {
  /** Absolute path to games/<id>/.build/android */
  outputDir: string;
  /** Absolute path to games/<id>/dist (web production output) */
  webDistDir: string;
  settings: AndroidBuildSettings;
}

function orientationManifestValue(
  orientation: AndroidBuildSettings["orientation"],
): string {
  switch (orientation) {
    case "portrait":
      return "portrait";
    case "landscape":
      return "sensorLandscape";
    default:
      return "fullSensor";
  }
}

function buildCapacitorConfig(settings: AndroidBuildSettings): string {
  const config = {
    appId: settings.applicationId,
    appName: settings.appName,
    webDir: ANDROID_WEB_DIR,
    android: {
      allowMixedContent: false,
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function buildPackageJson(settings: AndroidBuildSettings): string {
  const pkg = {
    name: `${settings.applicationId}.android-shell`,
    version: settings.versionName,
    private: true,
    type: "module",
    dependencies: {
      "@capacitor/android": CAPACITOR_VERSION,
      "@capacitor/cli": CAPACITOR_VERSION,
      "@capacitor/core": CAPACITOR_VERSION,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function buildGradleProperties(): string {
  return [
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8`,
    `android.useAndroidX=true`,
    `game.editor.compileSdk=${String(ANDROID_COMPILE_SDK)}`,
    `game.editor.targetSdk=${String(ANDROID_TARGET_SDK)}`,
    `game.editor.minSdk=${String(ANDROID_MIN_SDK)}`,
    "",
  ].join("\n");
}

/**
 * Writes a Capacitor Android shell under outputDir and copies the web dist
 * into webDir. Does not run npm/cap/gradle.
 */
export class AndroidProjectGenerator {
  async generate(options: AndroidProjectGenerateOptions): Promise<void> {
    const { outputDir, webDistDir, settings } = options;
    await mkdir(outputDir, { recursive: true });

    await writeFile(
      path.join(outputDir, "package.json"),
      buildPackageJson(settings),
      "utf8",
    );
    await writeFile(
      path.join(outputDir, "capacitor.config.json"),
      buildCapacitorConfig(settings),
      "utf8",
    );
    await writeFile(
      path.join(outputDir, "game-editor-android.properties"),
      buildGradleProperties(),
      "utf8",
    );

    // Marker used by tests and docs; applied after `cap add android`.
    await writeFile(
      path.join(outputDir, "game-editor-android.json"),
      `${JSON.stringify(
        {
          applicationId: settings.applicationId,
          appName: settings.appName,
          versionName: settings.versionName,
          versionCode: settings.versionCode,
          orientation: settings.orientation,
          orientationManifest: orientationManifestValue(settings.orientation),
          fullscreen: settings.fullscreen,
          immersiveMode: settings.immersiveMode,
          keepScreenAwake: settings.keepScreenAwake,
          webDir: ANDROID_WEB_DIR,
          compileSdk: ANDROID_COMPILE_SDK,
          targetSdk: ANDROID_TARGET_SDK,
          minSdk: ANDROID_MIN_SDK,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const wwwDir = path.join(outputDir, ANDROID_WEB_DIR);
    await rm(wwwDir, { recursive: true, force: true });
    await mkdir(wwwDir, { recursive: true });
    await cp(webDistDir, wwwDir, { recursive: true });

    // Optional starter README for operators inspecting .build/
    const readmeTemplate = path.join(ANDROID_TEMPLATE_ROOT, "README.md");
    try {
      const readme = await readFile(readmeTemplate, "utf8");
      await writeFile(path.join(outputDir, "README.md"), readme, "utf8");
    } catch {
      // Template optional.
    }
  }
}

export { orientationManifestValue, buildCapacitorConfig, buildPackageJson };
