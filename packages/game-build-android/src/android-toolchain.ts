import { access, constants, readdir } from "node:fs/promises";
import path from "node:path";
import type { ProcessRunner } from "@game-editor/game-build";
import {
  ANDROID_REQUIRED_JDK_MAJOR,
  ANDROID_TARGET_SDK,
} from "./android-constants.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export interface JdkLocateResult {
  found: boolean;
  /** Major version when detectable (e.g. 21). */
  majorVersion?: number;
  /** Absolute JDK home to pass as JAVA_HOME to Gradle. */
  javaHome?: string;
  detail?: string;
}

export interface AndroidSdkLocateResult {
  found: boolean;
  sdkRoot?: string;
  platformInstalled: boolean;
  detail?: string;
}

export interface JdkCandidate {
  home: string;
  major: number;
}

export function parseJavaMajor(versionOutput: string): number | undefined {
  // openjdk version "21.0.2"  or java version "1.8.0_392"
  const match = /version\s+"(\d+)(?:\.(\d+))?/.exec(versionOutput);
  if (!match) {
    return undefined;
  }
  const major = Number(match[1]);
  if (major === 1 && match[2] !== undefined) {
    return Number(match[2]);
  }
  return Number.isFinite(major) ? major : undefined;
}

export function javaExecutable(javaHome: string): string {
  return path.join(
    javaHome,
    "bin",
    process.platform === "win32" ? "java.exe" : "java",
  );
}

function javacExecutable(javaHome: string): string {
  return path.join(
    javaHome,
    "bin",
    process.platform === "win32" ? "javac.exe" : "javac",
  );
}

/**
 * Prefer JAVA_HOME when it already meets the required major; otherwise the
 * newest qualifying JDK (Gradle follows JAVA_HOME, which may be older than PATH).
 */
export function selectJdkHome(
  candidates: readonly JdkCandidate[],
  requiredMajor: number,
  preferredHome?: string,
): JdkCandidate | undefined {
  const qualifying = candidates.filter(
    (candidate) => candidate.major >= requiredMajor,
  );
  if (qualifying.length === 0) {
    return undefined;
  }
  if (preferredHome) {
    const preferred = path.resolve(preferredHome);
    const match = qualifying.find(
      (candidate) => path.resolve(candidate.home) === preferred,
    );
    if (match) {
      return match;
    }
  }
  return qualifying.reduce((best, current) =>
    current.major > best.major ? current : best,
  );
}

async function isJdkHome(home: string): Promise<boolean> {
  return (
    (await pathExists(javaExecutable(home))) &&
    (await pathExists(javacExecutable(home)))
  );
}

async function collectJdkHomes(env: NodeJS.ProcessEnv): Promise<string[]> {
  const homes: string[] = [];
  const seen = new Set<string>();
  const add = async (home: string | undefined): Promise<void> => {
    if (!home || home.trim().length === 0) {
      return;
    }
    const resolved = path.resolve(home.trim());
    if (seen.has(resolved)) {
      return;
    }
    if (!(await isJdkHome(resolved))) {
      return;
    }
    seen.add(resolved);
    homes.push(resolved);
  };

  await add(env.JAVA_HOME);

  const programFiles = env.ProgramFiles ?? "C:\\Program Files";
  const localApp = env.LOCALAPPDATA;
  const home = env.HOME ?? env.USERPROFILE;
  const scanRoots: string[] = [];

  if (process.platform === "win32") {
    scanRoots.push(
      path.join(programFiles, "Java"),
      path.join(programFiles, "Eclipse Adoptium"),
      path.join(programFiles, "Microsoft"),
      path.join(programFiles, "Amazon Corretto"),
      path.join(programFiles, "Android", "Android Studio", "jbr"),
    );
    if (localApp) {
      scanRoots.push(path.join(localApp, "Programs", "Android Studio", "jbr"));
    }
  } else if (process.platform === "darwin") {
    scanRoots.push("/Library/Java/JavaVirtualMachines");
    await add("/Applications/Android Studio.app/Contents/jbr/Contents/Home");
  } else {
    scanRoots.push("/usr/lib/jvm");
  }

  for (const root of scanRoots) {
    if (await isJdkHome(root)) {
      await add(root);
      continue;
    }
    if (!(await pathExists(root))) {
      continue;
    }
    let entries: string[] = [];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const candidate = path.join(root, entry);
      if (await isJdkHome(candidate)) {
        await add(candidate);
        continue;
      }
      const nestedHome = path.join(candidate, "Contents", "Home");
      if (await isJdkHome(nestedHome)) {
        await add(nestedHome);
      }
    }
  }

  if (home && process.platform !== "win32") {
    await add(path.join(home, ".sdkman", "candidates", "java", "current"));
  }

  return homes;
}

export async function locateJdk(
  processRunner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
): Promise<JdkLocateResult> {
  const homes = await collectJdkHomes(env);
  const probed: JdkCandidate[] = [];

  for (const home of homes) {
    const major = await probeJavaMajor(processRunner, javaExecutable(home));
    if (major !== undefined) {
      probed.push({ home, major });
    }
  }

  const selected = selectJdkHome(
    probed,
    ANDROID_REQUIRED_JDK_MAJOR,
    env.JAVA_HOME,
  );
  if (selected) {
    return {
      found: true,
      majorVersion: selected.major,
      javaHome: selected.home,
    };
  }

  const pathMajor = await probeJavaMajor(processRunner, "java");
  if (pathMajor !== undefined && pathMajor >= ANDROID_REQUIRED_JDK_MAJOR) {
    return {
      found: true,
      majorVersion: pathMajor,
      detail:
        "java on PATH meets JDK 21 but JAVA_HOME points at an older JDK. Set JAVA_HOME to JDK 21+.",
    };
  }

  if (probed.length > 0) {
    const newest = probed.reduce((best, current) =>
      current.major > best.major ? current : best,
    );
    return {
      found: true,
      majorVersion: newest.major,
      javaHome: newest.home,
      detail: `Found JDK ${String(newest.major)}; JDK ${String(ANDROID_REQUIRED_JDK_MAJOR)} or newer is required.`,
    };
  }

  if (pathMajor !== undefined) {
    return {
      found: true,
      majorVersion: pathMajor,
      detail: `java on PATH is major version ${String(pathMajor)}.`,
    };
  }

  return {
    found: false,
    detail: "Java/JDK was not found on PATH or in well-known install locations.",
  };
}

async function probeJavaMajor(
  processRunner: ProcessRunner,
  command: string,
): Promise<number | undefined> {
  try {
    const result = await processRunner.run(command, ["-version"]);
    return parseJavaMajor(`${result.stderr}\n${result.stdout}`);
  } catch {
    return undefined;
  }
}

/** Env overlay so Gradle uses the located JDK instead of a stale JAVA_HOME. */
export function gradleJavaEnv(
  jdk: JdkLocateResult,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  if (!jdk.javaHome) {
    return { ...env };
  }
  return {
    ...env,
    JAVA_HOME: jdk.javaHome,
    PATH: `${path.join(jdk.javaHome, "bin")}${path.delimiter}${env.PATH ?? ""}`,
  };
}

export function resolveAndroidSdkRoot(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const fromEnv =
    env.ANDROID_HOME?.trim() ||
    env.ANDROID_SDK_ROOT?.trim() ||
    undefined;
  if (fromEnv) {
    return fromEnv;
  }
  const home = env.HOME ?? env.USERPROFILE;
  if (!home) {
    return undefined;
  }
  if (process.platform === "win32") {
    const local = env.LOCALAPPDATA;
    if (local) {
      return path.join(local, "Android", "Sdk");
    }
    return path.join(home, "AppData", "Local", "Android", "Sdk");
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Android", "sdk");
  }
  return path.join(home, "Android", "Sdk");
}

export async function locateAndroidSdk(
  env: NodeJS.ProcessEnv = process.env,
  targetSdk: number = ANDROID_TARGET_SDK,
): Promise<AndroidSdkLocateResult> {
  const sdkRoot = resolveAndroidSdkRoot(env);
  if (!sdkRoot || !(await pathExists(sdkRoot))) {
    return {
      found: false,
      platformInstalled: false,
      detail:
        "ANDROID_HOME / ANDROID_SDK_ROOT is not set or the SDK directory does not exist.",
    };
  }
  const platformDir = path.join(
    sdkRoot,
    "platforms",
    `android-${String(targetSdk)}`,
  );
  const platformInstalled = await pathExists(platformDir);
  return {
    found: true,
    sdkRoot,
    platformInstalled,
    detail: platformInstalled
      ? undefined
      : `SDK platform android-${String(targetSdk)} is not installed under ${sdkRoot}.`,
  };
}

export { ANDROID_REQUIRED_JDK_MAJOR } from "./android-constants.js";

export async function listDirNames(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}
