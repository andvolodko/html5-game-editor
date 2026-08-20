import { spawn } from "node:child_process";
import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "@game-editor/core";

/**
 * Open a project file or folder in the OS file manager.
 *
 * Windows: spawn `explorer.exe` without `windowsHide`. CREATE_NO_WINDOW
 * (`windowsHide`) makes Explorer succeed but never show a window. explorer.exe
 * also often exits with code 1 even when it opened the folder — that is not a
 * failure.
 */
export async function openInFileManager(absolutePath: string): Promise<void> {
  const resolved = path.resolve(absolutePath);
  try {
    await access(resolved, constants.F_OK);
  } catch {
    throw new DomainError(
      "PATH_NOT_FOUND",
      `Output path does not exist: ${resolved}`,
    );
  }

  const info = await stat(resolved);
  if (process.platform === "win32") {
    const invocation = resolveWindowsExplorerInvocation(
      resolved,
      info.isDirectory(),
    );
    await spawnDetached(invocation.command, invocation.args, {
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    });
    return;
  }
  if (process.platform === "darwin") {
    const args = info.isDirectory() ? [resolved] : ["-R", resolved];
    await spawnDetached("open", args);
    return;
  }
  await spawnDetached("xdg-open", [
    info.isDirectory() ? resolved : path.dirname(resolved),
  ]);
}

export function resolveWindowsExplorerInvocation(
  absolutePath: string,
  isDirectory: boolean,
): { command: string; args: string[]; windowsVerbatimArguments: boolean } {
  const normalized = path.win32.normalize(absolutePath);
  if (isDirectory) {
    return {
      command: "explorer.exe",
      args: [normalized],
      windowsVerbatimArguments: /[\s,]/.test(normalized),
    };
  }
  return {
    command: "explorer.exe",
    args: [`/select,${normalized}`],
    windowsVerbatimArguments: true,
  };
}

function spawnDetached(
  command: string,
  args: readonly string[],
  extra: { windowsVerbatimArguments?: boolean } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      detached: true,
      stdio: "ignore",
      // Do not set windowsHide — it hides the file-manager window.
      ...(extra.windowsVerbatimArguments
        ? { windowsVerbatimArguments: true }
        : {}),
    });
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };
    child.once("error", (error) => {
      finish(error);
    });
    child.unref();
    setImmediate(() => {
      finish();
    });
  });
}
