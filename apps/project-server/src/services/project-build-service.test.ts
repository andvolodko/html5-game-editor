import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { ValidationError } from "@game-editor/core";
import type { BuildResult, BuildService } from "@game-editor/game-build";
import { PROJECT_SCHEMA_VERSION } from "@game-editor/project";
import { ProjectBuildService } from "./project-build-service.js";
import { ProjectService } from "./project-service.js";
import type { ProjectFileService } from "./project-file-service.js";

describe("ProjectBuildService", () => {
  const projectRoot = path.resolve("/tmp/game-project");

  function createService(buildImpl?: BuildService) {
    const projectService = new ProjectService(projectRoot);
    const projectFileService = {
      loadProject: vi.fn(async () => ({
        name: "demo",
        version: PROJECT_SCHEMA_VERSION,
        displayName: "Demo",
        renderers: ["pixi" as const],
        startScene: "main",
        resolution: { width: 1280, height: 720 },
        background: "#0b0d12",
      })),
    } as unknown as ProjectFileService;
    const buildService =
      buildImpl ??
      ({
        build: vi.fn(async () => ({
          ok: true,
          artifacts: [
            {
              type: "apk",
              path: path.join(projectRoot, ".build", "android", "app.apk"),
            },
          ],
          issues: [],
          logPath: path.join(projectRoot, ".build", "android", "build.log"),
        })),
      } as unknown as BuildService);
    return {
      service: new ProjectBuildService(
        projectService,
        projectFileService,
        buildService,
      ),
      buildService,
      projectFileService,
    };
  }

  it("parses allowlisted build requests with buildType", () => {
    const { service } = createService();
    expect(service.parseRequest({ platform: "android" })).toEqual({
      platform: "android",
      mode: "production",
      format: "apk",
      buildType: "debug",
    });
    expect(
      service.parseRequest({
        platform: "android",
        buildType: "release",
        format: "aab",
      }),
    ).toEqual({
      platform: "android",
      mode: "production",
      format: "aab",
      buildType: "release",
    });
    expect(service.parseRequest({ platform: "web", mode: "development" })).toEqual({
      platform: "web",
      mode: "development",
      format: "web",
      buildType: "debug",
    });
  });

  it("rejects unknown platforms and aab+debug", () => {
    const { service } = createService();
    expect(() => service.parseRequest({ platform: "ios" })).toThrow(
      ValidationError,
    );
    expect(() =>
      service.parseRequest({
        platform: "android",
        format: "aab",
        buildType: "debug",
      }),
    ).toThrow(ValidationError);
  });

  it("relativizes artifact paths under the project root", () => {
    const { service } = createService();
    const result: BuildResult = {
      ok: true,
      artifacts: [
        {
          type: "apk",
          path: path.join(projectRoot, ".build", "android", "app-debug.apk"),
        },
      ],
      issues: [],
      logPath: path.join(projectRoot, ".build", "android", "build.log"),
    };
    const relative = service.toProjectRelative(result, projectRoot);
    expect(relative.artifacts[0]?.path.replace(/\\/g, "/")).toBe(
      ".build/android/app-debug.apk",
    );
    expect(relative.artifacts[0]?.absolutePath).toBe(
      path.join(projectRoot, ".build", "android", "app-debug.apk"),
    );
    expect(relative.logPath?.replace(/\\/g, "/")).toBe(
      ".build/android/build.log",
    );
    expect(relative.logAbsolutePath).toBe(
      path.join(projectRoot, ".build", "android", "build.log"),
    );
  });
});
