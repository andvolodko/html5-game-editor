import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  ProcessRunError,
  type ProcessRunner,
  type ProcessRunOptions,
  type ProcessRunResult,
} from "./process-runner.js";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Node (CVE-2024-27980) rejects spawning `.cmd` / `.bat` on Windows without a
 * shell (`spawn EINVAL`). Wrap those through `cmd.exe /d /s /c` so args stay
 * separate from `shell: true` (avoids DEP0190).
 */
export function resolveExecFileInvocation(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  if (platform === "win32" && /\.(?:cmd|bat)$/i.test(command)) {
    const line = [command, ...args].map(quoteWindowsCmdArg).join(" ");
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", line],
    };
  }
  return { command, args: [...args] };
}

function quoteWindowsCmdArg(value: string): string {
  if (value.length === 0) {
    return '""';
  }
  if (!/[\s"&<>|^%]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Default process runner using execFile (no shell).
 * Suitable for pnpm, java, gradlew, capacitor CLI.
 */
export class ExecFileProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: readonly string[],
    options: ProcessRunOptions = {},
  ): Promise<ProcessRunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const invocation = resolveExecFileInvocation(command, args);
    try {
      const result = await execFileAsync(invocation.command, invocation.args, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : process.env,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: 0,
      };
    } catch (error) {
      const failure = error as {
        code?: number | string;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        message?: string;
        killed?: boolean;
      };
      const exitCode =
        typeof failure.code === "number"
          ? failure.code
          : failure.killed
            ? 124
            : 1;
      const stdout =
        typeof failure.stdout === "string"
          ? failure.stdout
          : Buffer.isBuffer(failure.stdout)
            ? failure.stdout.toString("utf8")
            : "";
      const stderr =
        typeof failure.stderr === "string"
          ? failure.stderr
          : Buffer.isBuffer(failure.stderr)
            ? failure.stderr.toString("utf8")
            : (failure.message ?? String(error));
      throw new ProcessRunError({
        command,
        args,
        exitCode,
        stdout,
        stderr,
      });
    }
  }
}
