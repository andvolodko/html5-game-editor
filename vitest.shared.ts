/**
 * Vitest defaults `maxWorkers` to CPU count. Recursive `pnpm test` already
 * runs several packages at once, so a high-core machine can spawn dozens of
 * Node workers and OOM. tinypool then reports `ERR_IPC_CHANNEL_CLOSED`.
 */
export const VITEST_MAX_WORKERS = 2;

export const sharedTestOptions = {
  include: ["src/**/*.test.ts"],
  maxWorkers: VITEST_MAX_WORKERS,
};
