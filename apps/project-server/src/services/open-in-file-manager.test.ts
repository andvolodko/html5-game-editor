import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  openInFileManager,
  resolveWindowsExplorerInvocation,
} from "./open-in-file-manager.js";

describe("openInFileManager", () => {
  it("rejects missing paths", async () => {
    const missing = path.join(
      process.cwd(),
      `.missing-open-path-${Date.now()}`,
    );
    await expect(openInFileManager(missing)).rejects.toMatchObject({
      code: "PATH_NOT_FOUND",
    });
  });
});

describe("resolveWindowsExplorerInvocation", () => {
  it("opens a folder by passing the path to explorer.exe", () => {
    const result = resolveWindowsExplorerInvocation(
      "C:\\Work\\_Projects\\html5-game-editor\\games\\demo\\dist",
      true,
    );
    expect(result.command).toBe("explorer.exe");
    expect(result.args).toEqual([
      "C:\\Work\\_Projects\\html5-game-editor\\games\\demo\\dist",
    ]);
    expect(result.windowsVerbatimArguments).toBe(false);
  });

  it("selects a file with /select, and verbatim args", () => {
    const result = resolveWindowsExplorerInvocation(
      "C:\\proj\\app-debug.apk",
      false,
    );
    expect(result.args).toEqual(["/select,C:\\proj\\app-debug.apk"]);
    expect(result.windowsVerbatimArguments).toBe(true);
  });

  it("uses verbatim args for folder paths with spaces", () => {
    const result = resolveWindowsExplorerInvocation(
      "C:\\Program Files\\game\\dist",
      true,
    );
    expect(result.windowsVerbatimArguments).toBe(true);
    expect(result.args[0]).toBe("C:\\Program Files\\game\\dist");
  });
});
