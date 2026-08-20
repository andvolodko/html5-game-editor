/**
 * Thin CLI for Android builds (debug APK, release APK, AAB).
 *
 * Usage:
 *   pnpm --filter @game-editor/game-build-android build:android -- games/solitaire
 *   pnpm --filter @game-editor/game-build-android build:android -- games/solitaire --format aab
 *   pnpm --filter @game-editor/game-build-android build:android -- games/solitaire --format apk --release
 *   pnpm --filter @game-editor/game-build-android build:debug -- games/solitaire
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseProjectData } from "@game-editor/project";
import type { BuildFormat, BuildType } from "@game-editor/game-build";
import { createGameBuildService } from "./create-build-service.js";

function parseArgs(argv: string[]): {
  projectArg?: string;
  format: BuildFormat;
  buildType: BuildType;
} {
  const args = argv.filter((a) => a !== "--");
  let format: BuildFormat = "apk";
  let buildType: BuildType = "debug";
  const positional: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--format") {
      const next = args[i + 1];
      if (next === "apk" || next === "aab") {
        format = next;
        i += 1;
      }
      continue;
    }
    if (arg === "--release") {
      buildType = "release";
      continue;
    }
    if (arg === "--debug") {
      buildType = "debug";
      continue;
    }
    if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length);
      if (value === "apk" || value === "aab") {
        format = value;
      }
      continue;
    }
    positional.push(arg);
  }
  if (format === "aab") {
    buildType = "release";
  }
  return { projectArg: positional[0], format, buildType };
}

async function main(): Promise<void> {
  const { projectArg, format, buildType } = parseArgs(process.argv.slice(2));
  if (!projectArg) {
    process.stderr.write(
      "Usage: build:android -- <projectRoot> [--format apk|aab] [--release]\n",
    );
    process.exitCode = 1;
    return;
  }

  const projectRoot = path.resolve(process.cwd(), projectArg);
  const projectJson = await readFile(
    path.join(projectRoot, "project.json"),
    "utf8",
  );
  const project = parseProjectData(JSON.parse(projectJson) as unknown);
  const service = createGameBuildService();

  const result = await service.build({
    projectRoot,
    project,
    platform: "android",
    mode: "production",
    format,
    buildType,
    onProgress: (event) => {
      process.stdout.write(`[${event.stage}] ${event.message}\n`);
    },
  });

  if (!result.ok) {
    for (const issue of result.issues) {
      process.stderr.write(`${issue.severity} ${issue.code}: ${issue.message}\n`);
    }
    process.exitCode = 1;
    return;
  }

  for (const artifact of result.artifacts) {
    process.stdout.write(`artifact ${artifact.type}: ${artifact.path}\n`);
  }
}

void main();
