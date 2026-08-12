import { describe, expect, it } from "vitest";
import path from "node:path";
import { ProjectRootGuard } from "./project-root-guard.js";

describe("ProjectRootGuard", () => {
  const root = path.resolve("/tmp/game-project");
  const guard = new ProjectRootGuard(root);

  it("resolves paths inside the project root", () => {
    const resolved = guard.resolveSafe("assets/tex.png");
    expect(resolved).toBe(path.resolve(root, "assets/tex.png"));
  });

  it("rejects path traversal", () => {
    expect(() => guard.resolveSafe("../outside.txt")).toThrow(/PATH_ESCAPE|escapes project root/);
  });
});
