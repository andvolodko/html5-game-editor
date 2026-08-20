import { describe, expect, it } from "vitest";
import { BuildTargetRegistry } from "./build-target-registry.js";
import { BuildService } from "./build-service.js";
import type { ProcessRunner, ProcessRunResult } from "./process-runner.js";
import type {
  BuildContext,
  BuildResult,
  BuildTarget,
  BuildValidationResult,
} from "./types.js";
import { hasFatalBuildIssues, mergeBuildIssues } from "./types.js";
import type { ProjectData } from "@game-editor/project";

const sampleProject: ProjectData = {
  name: "demo",
  version: 1,
  displayName: "Demo",
  renderers: ["pixi"],
  startScene: "main",
  resolution: { width: 1280, height: 720 },
  background: "#0b0d12",
};

function createMockRunner(
  impl?: (
    command: string,
    args: readonly string[],
  ) => Promise<ProcessRunResult>,
): ProcessRunner {
  return {
    run: async (command, args) => {
      if (impl) {
        return impl(command, args);
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  };
}

function createStubTarget(
  id: string,
  options: {
    validateIssues?: BuildValidationResult["issues"];
    buildResult?: BuildResult;
  } = {},
): BuildTarget {
  return {
    id,
    name: id,
    async validate(_context: BuildContext): Promise<BuildValidationResult> {
      return { issues: options.validateIssues ?? [] };
    },
    async build(_context: BuildContext): Promise<BuildResult> {
      return (
        options.buildResult ?? {
          ok: true,
          artifacts: [{ type: "web", path: "/tmp/dist" }],
          issues: [],
        }
      );
    },
  };
}

describe("BuildTargetRegistry", () => {
  it("registers and resolves targets", () => {
    const registry = new BuildTargetRegistry();
    const web = createStubTarget("web");
    registry.register(web);
    expect(registry.get("web")).toBe(web);
    expect(registry.require("web")).toBe(web);
    expect(registry.list()).toEqual([web]);
  });

  it("rejects duplicate ids", () => {
    const registry = new BuildTargetRegistry();
    registry.register(createStubTarget("web"));
    expect(() => registry.register(createStubTarget("web"))).toThrow(
      /duplicate/,
    );
  });

  it("throws for unknown require", () => {
    const registry = new BuildTargetRegistry();
    expect(() => registry.require("android")).toThrow(/unknown/);
  });
});

describe("hasFatalBuildIssues", () => {
  it("detects errors but ignores warnings", () => {
    expect(
      hasFatalBuildIssues([
        { severity: "warning", code: "W", message: "warn" },
      ]),
    ).toBe(false);
    expect(
      hasFatalBuildIssues([
        { severity: "error", code: "E", message: "err" },
      ]),
    ).toBe(true);
  });
});

describe("mergeBuildIssues", () => {
  it("dedupes identical issues from validation and build", () => {
    const warning = {
      severity: "warning" as const,
      code: "ANDROID_DEBUG_UNSIGNED",
      message: "debug",
    };
    expect(mergeBuildIssues([warning], [warning, warning])).toEqual([warning]);
  });
});

describe("BuildService", () => {
  it("returns UNKNOWN_BUILD_PLATFORM for unregistered targets", async () => {
    const service = new BuildService({
      registry: new BuildTargetRegistry(),
      processRunner: createMockRunner(),
    });
    const result = await service.build({
      projectRoot: "/tmp/game",
      project: sampleProject,
      platform: "android",
    });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe("UNKNOWN_BUILD_PLATFORM");
  });

  it("aborts before build when validation has errors", async () => {
    const registry = new BuildTargetRegistry();
    let built = false;
    registry.register({
      id: "web",
      name: "Web",
      async validate() {
        return {
          issues: [
            {
              severity: "error",
              code: "WEB_PACKAGE_JSON_MISSING",
              message: "missing",
            },
          ],
        };
      },
      async build() {
        built = true;
        return { ok: true, artifacts: [], issues: [] };
      },
    });
    const service = new BuildService({
      registry,
      processRunner: createMockRunner(),
    });
    const result = await service.build({
      projectRoot: "/tmp/game",
      project: sampleProject,
      platform: "web",
    });
    expect(result.ok).toBe(false);
    expect(built).toBe(false);
    expect(result.issues[0]?.code).toBe("WEB_PACKAGE_JSON_MISSING");
  });

  it("returns artifacts from a successful target build", async () => {
    const registry = new BuildTargetRegistry();
    registry.register(
      createStubTarget("web", {
        buildResult: {
          ok: true,
          artifacts: [{ type: "web", path: "/tmp/game/dist" }],
          issues: [],
        },
      }),
    );
    const service = new BuildService({
      registry,
      processRunner: createMockRunner(),
    });
    const result = await service.build({
      projectRoot: "/tmp/game",
      project: sampleProject,
      platform: "web",
    });
    expect(result.ok).toBe(true);
    expect(result.artifacts).toEqual([
      { type: "web", path: "/tmp/game/dist" },
    ]);
  });

  it("rejects a second concurrent build", async () => {
    const registry = new BuildTargetRegistry();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    registry.register({
      id: "web",
      name: "Web",
      async validate() {
        return { issues: [] };
      },
      async build() {
        await gate;
        return {
          ok: true,
          artifacts: [{ type: "web", path: "/a/dist" }],
          issues: [],
        };
      },
    });
    const service = new BuildService({
      registry,
      processRunner: createMockRunner(),
    });
    const first = service.build({
      projectRoot: "/a",
      project: sampleProject,
      platform: "web",
    });
    await Promise.resolve();
    const second = await service.build({
      projectRoot: "/b",
      project: sampleProject,
      platform: "web",
    });
    expect(second.ok).toBe(false);
    expect(second.issues[0]?.code).toBe("BUILD_IN_PROGRESS");
    release();
    const firstResult = await first;
    expect(firstResult.ok).toBe(true);
  });
});
