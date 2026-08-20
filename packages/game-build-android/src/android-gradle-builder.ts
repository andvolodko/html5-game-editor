import { access, constants, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildFormat, BuildType, ProcessRunner } from "@game-editor/game-build";
import { ProcessRunError } from "@game-editor/game-build";
import { gradleJavaEnv, locateJdk } from "./android-toolchain.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function gradlewCommand(androidDir: string): { command: string; argsPrefix: string[] } {
  if (process.platform === "win32") {
    return {
      command: path.join(androidDir, "gradlew.bat"),
      argsPrefix: [],
    };
  }
  return {
    command: path.join(androidDir, "gradlew"),
    argsPrefix: [],
  };
}

export function resolveGradleTask(
  buildType: BuildType,
  format: BuildFormat,
): "assembleDebug" | "assembleRelease" | "bundleRelease" {
  if (format === "aab") {
    return "bundleRelease";
  }
  if (buildType === "release") {
    return "assembleRelease";
  }
  return "assembleDebug";
}

/** Flags that keep Gradle from hanging on stdin / reusing a JDK 17 daemon. */
export const GRADLE_WRAPPER_ARGS = [
  "--no-daemon",
  "--console=plain",
  "--stacktrace",
] as const;

/** Paths with spaces must not go on the Gradle CLI (Windows cmd splits them). */
export function withGradleJavaHomeProperty(
  source: string,
  javaHome: string,
): string {
  const line = `org.gradle.java.home=${javaHome.replaceAll("\\", "/")}`;
  if (/^org\.gradle\.java\.home=/m.test(source)) {
    return source.replace(/^org\.gradle\.java\.home=.*$/m, line);
  }
  const trimmed = source.trimEnd();
  return trimmed.length === 0 ? `${line}\n` : `${trimmed}\n${line}\n`;
}

export class AndroidGradleBuilder {
  constructor(private readonly processRunner: ProcessRunner) {}

  async assembleDebug(androidDir: string): Promise<string> {
    const result = await this.runTask(androidDir, "assembleDebug");
    return result.path;
  }

  async buildArtifact(
    androidDir: string,
    buildType: BuildType,
    format: BuildFormat,
  ): Promise<{ type: "apk" | "aab"; path: string; task: string }> {
    const task = resolveGradleTask(buildType, format);
    const artifactType = format === "aab" ? "aab" : "apk";
    const { path: artifactPath } = await this.runTask(androidDir, task);
    return { type: artifactType, path: artifactPath, task };
  }

  private async runTask(
    androidDir: string,
    task: "assembleDebug" | "assembleRelease" | "bundleRelease",
  ): Promise<{ path: string }> {
    const { command, argsPrefix } = gradlewCommand(androidDir);
    if (!(await pathExists(command))) {
      throw Object.assign(
        new Error(
          `Android build failed during Gradle ${task}.\n\nCause:\nGradle wrapper not found at ${command}`,
        ),
        { code: "GRADLE_BUILD_FAILED" },
      );
    }

    const jdk = await locateJdk(this.processRunner);
    if (jdk.javaHome) {
      const propertiesPath = path.join(androidDir, "gradle.properties");
      let existing = "";
      try {
        existing = await readFile(propertiesPath, "utf8");
      } catch {
        existing = "";
      }
      await writeFile(
        propertiesPath,
        withGradleJavaHomeProperty(existing, jdk.javaHome),
        "utf8",
      );
    }
    const args = [...argsPrefix, ...GRADLE_WRAPPER_ARGS, task];

    try {
      await this.processRunner.run(command, args, {
        cwd: androidDir,
        env: gradleJavaEnv(jdk),
      });
    } catch (error) {
      const cause =
        error instanceof ProcessRunError
          ? error.stderr.trim() || error.stdout.trim() || error.message
          : error instanceof Error
            ? error.message
            : String(error);
      const code =
        task === "assembleDebug"
          ? "GRADLE_BUILD_FAILED"
          : /sign|keystore|password|alias/i.test(cause)
            ? "SIGNING_FAILED"
            : "GRADLE_BUILD_FAILED";
      throw Object.assign(
        new Error(
          `Android build failed during Gradle ${task}.\n\nCommand:\n./gradlew ${task}\n\nCause:\n${cause}`,
        ),
        { code },
      );
    }

    const artifactPath =
      task === "bundleRelease"
        ? await this.resolveReleaseAab(androidDir)
        : task === "assembleRelease"
          ? await this.resolveReleaseApk(androidDir)
          : await this.resolveDebugApk(androidDir);

    if (!artifactPath) {
      throw Object.assign(
        new Error(
          `Android build failed during Gradle ${task}.\n\nCause:\nExpected artifact was not found under app/build/outputs/.`,
        ),
        { code: "GRADLE_BUILD_FAILED" },
      );
    }
    return { path: artifactPath };
  }

  async resolveDebugApk(androidDir: string): Promise<string | undefined> {
    return this.resolveFirstFile(
      path.join(androidDir, "app", "build", "outputs", "apk", "debug"),
      ".apk",
    );
  }

  async resolveReleaseApk(androidDir: string): Promise<string | undefined> {
    return this.resolveFirstFile(
      path.join(androidDir, "app", "build", "outputs", "apk", "release"),
      ".apk",
    );
  }

  async resolveReleaseAab(androidDir: string): Promise<string | undefined> {
    return this.resolveFirstFile(
      path.join(androidDir, "app", "build", "outputs", "bundle", "release"),
      ".aab",
    );
  }

  private async resolveFirstFile(
    dirPath: string,
    extension: string,
  ): Promise<string | undefined> {
    if (!(await pathExists(dirPath))) {
      return undefined;
    }
    const entries = await readdir(dirPath);
    const name = entries.find((entry) => entry.endsWith(extension));
    return name ? path.join(dirPath, name) : undefined;
  }
}
