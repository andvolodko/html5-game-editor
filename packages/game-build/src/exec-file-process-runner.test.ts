import { describe, expect, it } from "vitest";
import { resolveExecFileInvocation } from "./exec-file-process-runner.js";

describe("resolveExecFileInvocation", () => {
  it("passes through unix commands unchanged", () => {
    expect(resolveExecFileInvocation("pnpm", ["exec", "vite", "build"], "linux")).toEqual({
      command: "pnpm",
      args: ["exec", "vite", "build"],
    });
  });

  it("wraps Windows .cmd through cmd.exe /d /s /c", () => {
    const result = resolveExecFileInvocation(
      "pnpm.cmd",
      ["exec", "vite", "build", "--configLoader", "runner"],
      "win32",
    );
    expect(result.command.toLowerCase()).toMatch(/(cmd\.exe|command\.com)$/);
    expect(result.args.slice(0, 3)).toEqual(["/d", "/s", "/c"]);
    expect(result.args[3]).toBe(
      "pnpm.cmd exec vite build --configLoader runner",
    );
  });

  it("wraps Windows .bat the same way", () => {
    const result = resolveExecFileInvocation(
      "C:\\proj\\gradlew.bat",
      ["assembleDebug"],
      "win32",
    );
    expect(result.args.slice(0, 3)).toEqual(["/d", "/s", "/c"]);
    expect(result.args[3]).toBe("C:\\proj\\gradlew.bat assembleDebug");
  });

  it("quotes Windows paths that contain spaces", () => {
    const result = resolveExecFileInvocation(
      "C:\\Program Files\\proj\\gradlew.bat",
      ["assembleDebug"],
      "win32",
    );
    expect(result.args[3]).toBe(
      '"C:\\Program Files\\proj\\gradlew.bat" assembleDebug',
    );
  });

  it("does not wrap Windows .exe", () => {
    expect(
      resolveExecFileInvocation("java.exe", ["-version"], "win32"),
    ).toEqual({
      command: "java.exe",
      args: ["-version"],
    });
  });
});
