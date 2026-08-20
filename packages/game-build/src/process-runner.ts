export interface ProcessRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Kill the process after this many milliseconds. */
  timeoutMs?: number;
}

export interface ProcessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProcessRunner {
  run(
    command: string,
    args: readonly string[],
    options?: ProcessRunOptions,
  ): Promise<ProcessRunResult>;
}

export class ProcessRunError extends Error {
  readonly command: string;
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(args: {
    command: string;
    args: readonly string[];
    exitCode: number;
    stdout: string;
    stderr: string;
    message?: string;
  }) {
    const detail =
      args.message ??
      `Command failed (${String(args.exitCode)}): ${args.command} ${args.args.join(" ")}`;
    super(detail);
    this.name = "ProcessRunError";
    this.command = args.command;
    this.args = args.args;
    this.exitCode = args.exitCode;
    this.stdout = args.stdout;
    this.stderr = args.stderr;
  }
}
