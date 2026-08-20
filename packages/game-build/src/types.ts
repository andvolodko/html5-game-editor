import type { ProjectData } from "@game-editor/project";
import type { ProcessRunner } from "./process-runner.js";

export type BuildMode = "development" | "production";

export type BuildArtifactType = "web" | "apk" | "aab";

export type BuildPlatform = "web" | "android";

export type BuildFormat = "web" | "apk" | "aab";

/** Native packaging variant. Web builds ignore this. */
export type BuildType = "debug" | "release";

export type BuildIssueSeverity = "error" | "warning";

export interface BuildIssue {
  severity: BuildIssueSeverity;
  code: string;
  message: string;
}

export interface BuildArtifact {
  type: BuildArtifactType;
  /** Absolute filesystem path to the artifact. */
  path: string;
}

export interface BuildProgressEvent {
  stage: string;
  message: string;
  progress?: number;
}

export interface BuildValidationResult {
  issues: BuildIssue[];
}

export interface BuildResult {
  ok: boolean;
  artifacts: BuildArtifact[];
  issues: BuildIssue[];
  /** Absolute path to a full build log when available. */
  logPath?: string;
}

export interface BuildContext {
  projectRoot: string;
  project: ProjectData;
  mode: BuildMode;
  format: BuildFormat;
  /** Debug vs release packaging (Android). Defaults to debug. */
  buildType: BuildType;
  /** Absolute directory for target-specific generated output. */
  outputDir: string;
  processRunner: ProcessRunner;
  onProgress?: (event: BuildProgressEvent) => void;
}

export interface BuildTarget {
  readonly id: string;
  readonly name: string;
  validate(context: BuildContext): Promise<BuildValidationResult>;
  build(context: BuildContext): Promise<BuildResult>;
}

export function hasFatalBuildIssues(issues: readonly BuildIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

export function mergeBuildIssues(
  ...groups: readonly (readonly BuildIssue[])[]
): BuildIssue[] {
  const merged: BuildIssue[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const issue of group) {
      const key = `${issue.severity}:${issue.code}:${issue.message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(issue);
    }
  }
  return merged;
}
