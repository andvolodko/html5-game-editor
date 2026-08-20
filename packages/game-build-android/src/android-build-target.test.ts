import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultAndroidBuildSettings,
  type ProjectData,
} from "@game-editor/project";
import type { BuildContext, ProcessRunner } from "@game-editor/game-build";
import { AndroidBuildValidator } from "./android-build-validator.js";
import {
  AndroidProjectGenerator,
  buildCapacitorConfig,
} from "./android-project-generator.js";
import { ANDROID_TARGET_SDK, ANDROID_WEB_DIR } from "./android-constants.js";
import { createGameBuildRegistry } from "./create-build-service.js";
import { resolveGradleTask, GRADLE_WRAPPER_ARGS, withGradleJavaHomeProperty } from "./android-gradle-builder.js";
import { capacitorCliInvocation } from "./capacitor-sync.js";
import {
  loadAndroidSigningSecrets,
  saveAndroidSigningSecrets,
  isAndroidSigningSecretsComplete,
} from "./android-signing-secrets.js";
import { applyAndroidBranding } from "./android-branding-generator.js";
import sharp from "sharp";

const sampleProject: ProjectData = {
  name: "solitaire",
  version: 1,
  displayName: "Solitaire",
  renderers: ["pixi"],
  startScene: "main",
  resolution: { width: 720, height: 1280 },
  scaleMode: "cover",
  background: "#0d4a2e",
  android: createDefaultAndroidBuildSettings("Solitaire", "solitaire"),
};

function mockRunner(
  handlers: Record<
    string,
    (args: readonly string[]) => { stdout: string; stderr: string; exitCode: number }
  > = {},
): ProcessRunner {
  return {
    async run(command, args) {
      const key = path.basename(command);
      const handler = handlers[key] ?? handlers[command];
      if (handler) {
        return handler(args);
      }
      if (key === "java" || key === "java.exe" || command === "java") {
        return {
          stdout: "",
          stderr: 'openjdk version "21.0.2" 2024-01-16',
          exitCode: 0,
        };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  };
}

function baseContext(
  overrides: Partial<BuildContext> = {},
): BuildContext {
  return {
    projectRoot: process.cwd(),
    project: sampleProject,
    mode: "production",
    format: "apk",
    buildType: "debug",
    outputDir: path.join(os.tmpdir(), "ge-android-out"),
    processRunner: mockRunner(),
    ...overrides,
  };
}

describe("createGameBuildRegistry", () => {
  it("registers web and android targets", () => {
    const registry = createGameBuildRegistry();
    expect(registry.get("web")?.id).toBe("web");
    expect(registry.get("android")?.id).toBe("android");
  });
});

describe("resolveGradleTask", () => {
  it("maps buildType and format to Gradle tasks", () => {
    expect(resolveGradleTask("debug", "apk")).toBe("assembleDebug");
    expect(resolveGradleTask("release", "apk")).toBe("assembleRelease");
    expect(resolveGradleTask("release", "aab")).toBe("bundleRelease");
    expect(resolveGradleTask("debug", "aab")).toBe("bundleRelease");
    expect(GRADLE_WRAPPER_ARGS).toContain("--no-daemon");
  });

  it("writes org.gradle.java.home without CLI quoting", () => {
    expect(
      withGradleJavaHomeProperty("", "C:\\Program Files\\Java\\jdk-23"),
    ).toBe("org.gradle.java.home=C:/Program Files/Java/jdk-23\n");
  });
});

describe("capacitorCliInvocation", () => {
  it("runs the generated project's Capacitor CLI with Node", () => {
    const projectDir = path.join("C:", "proj", ".build", "android");
    const add = capacitorCliInvocation(projectDir, ["add", "android"]);
    expect(add.command).toBe(process.execPath);
    expect(add.args[0]?.replace(/\\/g, "/")).toMatch(
      /node_modules\/@capacitor\/cli\/bin\/capacitor$/,
    );
    expect(add.args.slice(1)).toEqual(["add", "android"]);
  });
});

describe("AndroidProjectGenerator", () => {
  it("writes capacitor config and copies web dist without Gradle", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ge-android-gen-"));
    try {
      const webDist = path.join(root, "dist");
      const outputDir = path.join(root, ".build", "android");
      await mkdir(webDist, { recursive: true });
      await writeFile(path.join(webDist, "index.html"), "<html></html>\n", "utf8");

      const settings = {
        ...createDefaultAndroidBuildSettings("Solitaire", "solitaire"),
        applicationId: "com.example.solitaire",
        orientation: "portrait" as const,
      };
      const generator = new AndroidProjectGenerator();
      await generator.generate({ outputDir, webDistDir: webDist, settings });

      const capConfig = JSON.parse(
        await readFile(path.join(outputDir, "capacitor.config.json"), "utf8"),
      ) as { appId: string; appName: string; webDir: string };
      expect(capConfig).toEqual({
        appId: "com.example.solitaire",
        appName: "Solitaire",
        webDir: ANDROID_WEB_DIR,
        android: { allowMixedContent: false },
      });

      const marker = JSON.parse(
        await readFile(path.join(outputDir, "game-editor-android.json"), "utf8"),
      ) as { targetSdk: number; orientationManifest: string };
      expect(marker.targetSdk).toBe(ANDROID_TARGET_SDK);
      expect(marker.orientationManifest).toBe("portrait");

      const copied = await readFile(
        path.join(outputDir, ANDROID_WEB_DIR, "index.html"),
        "utf8",
      );
      expect(copied).toContain("<html>");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("buildCapacitorConfig", () => {
  it("uses settings without hardcoded project values", () => {
    const json = buildCapacitorConfig({
      appName: "My Game",
      applicationId: "com.my.game",
      versionName: "1.0.0",
      versionCode: 1,
      orientation: "auto",
      fullscreen: true,
      immersiveMode: true,
      keepScreenAwake: false,
    });
    expect(json).toContain('"appId": "com.my.game"');
    expect(json).toContain('"appName": "My Game"');
    expect(json).not.toContain("solitaire");
  });
});

describe("Android signing secrets", () => {
  it("saves and loads secrets without empty passwords being complete", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ge-android-secrets-"));
    try {
      expect(await loadAndroidSigningSecrets(root)).toBeUndefined();
      await saveAndroidSigningSecrets(root, {
        keystorePassword: "store-secret",
        keyPassword: "key-secret",
      });
      const loaded = await loadAndroidSigningSecrets(root);
      expect(isAndroidSigningSecretsComplete(loaded)).toBe(true);
      expect(loaded?.keystorePassword).toBe("store-secret");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("AndroidBuildValidator", () => {
  it("reports invalid application id", async () => {
    const validator = new AndroidBuildValidator();
    const issues = await validator.validate(
      baseContext({
        project: {
          ...sampleProject,
          android: {
            ...createDefaultAndroidBuildSettings("X", "x"),
            applicationId: "bad id",
          },
        },
      }),
    );
    expect(issues.some((i) => i.code === "INVALID_APPLICATION_ID")).toBe(true);
  });

  it("rejects aab with debug buildType", async () => {
    const validator = new AndroidBuildValidator();
    const issues = await validator.validate(
      baseContext({ format: "aab", buildType: "debug" }),
    );
    expect(issues.some((i) => i.code === "ANDROID_FORMAT_UNSUPPORTED")).toBe(
      true,
    );
  });

  it("requires signing config for release builds", async () => {
    const validator = new AndroidBuildValidator();
    const issues = await validator.validate(
      baseContext({
        format: "aab",
        buildType: "release",
        project: {
          ...sampleProject,
          android: createDefaultAndroidBuildSettings("Solitaire", "solitaire"),
        },
      }),
    );
    expect(issues.some((i) => i.code === "KEYSTORE_NOT_FOUND")).toBe(true);
    expect(issues.some((i) => i.code === "KEY_ALIAS_MISSING")).toBe(true);
    expect(issues.some((i) => i.code === "SIGNING_SECRETS_MISSING")).toBe(true);
  });

  it("ignores missing secrets for debug apk", async () => {
    const validator = new AndroidBuildValidator();
    const issues = await validator.validate(baseContext());
    expect(issues.some((i) => i.code === "SIGNING_SECRETS_MISSING")).toBe(
      false,
    );
    expect(issues.some((i) => i.code === "ANDROID_DEBUG_UNSIGNED")).toBe(true);
  });
});

describe("applyAndroidBranding", () => {
  it("writes mipmap icons from a texture asset without Capacitor", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ge-android-brand-"));
    try {
      const iconPath = path.join(root, "assets", "icon.png");
      await mkdir(path.dirname(iconPath), { recursive: true });
      await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 4,
          background: { r: 20, g: 120, b: 200, alpha: 1 },
        },
      })
        .png()
        .toFile(iconPath);

      await mkdir(path.join(root, ".project"), { recursive: true });
      await writeFile(
        path.join(root, ".project", "assets.json"),
        `${JSON.stringify({
          version: 1,
          assets: [
            {
              id: "asset_icon",
              type: "texture",
              name: "icon.png",
              path: "assets/icon.png",
              metadata: {
                kind: "texture",
                width: 64,
                height: 64,
                mimeType: "image/png",
              },
            },
          ],
        })}\n`,
        "utf8",
      );

      const androidDir = path.join(root, "android");
      const result = await applyAndroidBranding({
        projectRoot: root,
        androidProjectDir: androidDir,
        settings: {
          ...createDefaultAndroidBuildSettings("Demo", "demo"),
          iconAssetId: "asset_icon",
        },
      });
      expect(result.issues).toEqual([]);
      await access(
        path.join(
          androidDir,
          "app",
          "src",
          "main",
          "res",
          "mipmap-mdpi",
          "ic_launcher.png",
        ),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
