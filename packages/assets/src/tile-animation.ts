/**
 * Shared TileSet animation resolver and clock.
 * Cells store logical tile IDs; this module maps them to a visible atlas frame.
 * Runtime elapsed / frame index is never serialized.
 */

import { isValidTileId, type TileAnimationFrame, type TileDefinition } from "./tileset.js";

export const DEFAULT_TILE_ANIMATION_DURATION_MS = 120;

/** Dual Pixi tickers (hybrid FG/BG) can fire in the same frame; coalesce. */
const ADVANCE_COALESCE_MS = 8;

export interface TileAnimationSource {
  columns: number;
  rows: number;
  tiles?: Record<string, TileDefinition>;
}

export function tileAnimationClockKey(
  tilesetId: string,
  logicalTileId: number,
): string {
  return `${tilesetId}:${String(logicalTileId)}`;
}

export function parseTileAnimationClockKey(
  key: string,
): { tilesetId: string; logicalTileId: number } | undefined {
  const split = key.lastIndexOf(":");
  if (split <= 0 || split === key.length - 1) {
    return undefined;
  }
  const logicalTileId = Number(key.slice(split + 1));
  if (!Number.isInteger(logicalTileId)) {
    return undefined;
  }
  return { tilesetId: key.slice(0, split), logicalTileId };
}

/**
 * Frames that can actually play: positive duration and a valid atlas tile.
 * Frame tile IDs are static regions — animations on those tiles are ignored.
 */
export function normalizeTileAnimationFrames(
  tileset: TileAnimationSource,
  frames: readonly TileAnimationFrame[] | undefined,
): TileAnimationFrame[] {
  if (!frames?.length) {
    return [];
  }
  const normalized: TileAnimationFrame[] = [];
  for (const frame of frames) {
    if (!(frame.duration > 0) || !Number.isFinite(frame.duration)) {
      continue;
    }
    if (!isValidTileId(frame.tileId, tileset.columns, tileset.rows)) {
      continue;
    }
    normalized.push({ tileId: frame.tileId, duration: frame.duration });
  }
  return normalized;
}

export function playableTileAnimationFrames(
  tileset: TileAnimationSource,
  logicalTileId: number,
): TileAnimationFrame[] {
  if (!isValidTileId(logicalTileId, tileset.columns, tileset.rows)) {
    return [];
  }
  const animation = tileset.tiles?.[String(logicalTileId)]?.animation;
  return normalizeTileAnimationFrames(tileset, animation?.frames);
}

/** True when the tile has at least two valid frames (visible frame can change). */
export function tileHasPlayableAnimation(
  tileset: TileAnimationSource,
  logicalTileId: number,
): boolean {
  return playableTileAnimationFrames(tileset, logicalTileId).length >= 2;
}

export function animatedLogicalTileIds(
  tileset: TileAnimationSource,
): number[] {
  if (!tileset.tiles) {
    return [];
  }
  const ids: number[] = [];
  for (const key of Object.keys(tileset.tiles)) {
    const logicalTileId = Number(key);
    if (!Number.isInteger(logicalTileId)) {
      continue;
    }
    if (tileHasPlayableAnimation(tileset, logicalTileId)) {
      ids.push(logicalTileId);
    }
  }
  ids.sort((a, b) => a - b);
  return ids;
}

export function tileAnimationLoops(
  tileset: TileAnimationSource,
  logicalTileId: number,
): boolean {
  return tileset.tiles?.[String(logicalTileId)]?.animation?.loop !== false;
}

/**
 * Visible atlas tile for a logical ID at `elapsedMs`.
 * Does not recursively resolve animation on frame tiles.
 */
export function resolveAnimatedTileFrame(
  tileset: TileAnimationSource,
  logicalTileId: number,
  elapsedMs: number,
): number {
  const frames = playableTileAnimationFrames(tileset, logicalTileId);
  if (frames.length === 0) {
    return logicalTileId;
  }
  if (frames.length === 1) {
    return frames[0]!.tileId;
  }
  const total = frames.reduce((sum, frame) => sum + frame.duration, 0);
  if (!(total > 0)) {
    return frames[0]!.tileId;
  }
  const loop = tileAnimationLoops(tileset, logicalTileId);
  let remaining = elapsedMs;
  if (!Number.isFinite(remaining) || remaining < 0) {
    remaining = 0;
  }
  if (loop) {
    remaining %= total;
    if (remaining < 0) {
      remaining += total;
    }
  }
  for (const frame of frames) {
    if (remaining < frame.duration) {
      return frame.tileId;
    }
    remaining -= frame.duration;
  }
  return frames[frames.length - 1]!.tileId;
}

export type TileAnimationFrameListener = (
  changedKeys: ReadonlySet<string>,
) => void;

/**
 * One timeline per (TileSet, logical tile). Cells sharing a definition stay in sync.
 */
export class TileAnimationClock {
  private readonly elapsed = new Map<string, number>();
  private readonly lastFrame = new Map<string, number>();
  private readonly tilesets = new Map<string, TileAnimationSource>();
  private readonly listeners = new Set<TileAnimationFrameListener>();
  private lastAdvanceAt: number | undefined;
  private lastChanged: ReadonlySet<string> = new Set();

  setTileset(tilesetId: string, tileset: TileAnimationSource): void {
    this.tilesets.set(tilesetId, tileset);
  }

  /** Drop runtime timing for one TileSet, or all if omitted. Not serialized. */
  invalidate(tilesetId?: string): void {
    if (tilesetId === undefined) {
      this.elapsed.clear();
      this.lastFrame.clear();
      this.tilesets.clear();
      this.lastAdvanceAt = undefined;
      this.lastChanged = new Set();
      return;
    }
    this.tilesets.delete(tilesetId);
    const prefix = `${tilesetId}:`;
    for (const key of [...this.elapsed.keys()]) {
      if (key.startsWith(prefix)) {
        this.elapsed.delete(key);
        this.lastFrame.delete(key);
      }
    }
  }

  currentFrame(
    tilesetId: string,
    tileset: TileAnimationSource,
    logicalTileId: number,
  ): number {
    this.setTileset(tilesetId, tileset);
    const key = tileAnimationClockKey(tilesetId, logicalTileId);
    return resolveAnimatedTileFrame(
      tileset,
      logicalTileId,
      this.elapsed.get(key) ?? 0,
    );
  }

  subscribe(listener: TileAnimationFrameListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Advance registered animations. Returns keys whose visible frame changed.
   * Pass `now` in tests. Callers in the same display frame are coalesced.
   */
  advance(deltaMs: number, now: number = nowMs()): ReadonlySet<string> {
    if (
      this.lastAdvanceAt !== undefined &&
      now - this.lastAdvanceAt < ADVANCE_COALESCE_MS
    ) {
      return this.lastChanged;
    }
    this.lastAdvanceAt = now;
    const step = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    const changed = new Set<string>();
    for (const [tilesetId, tileset] of this.tilesets) {
      for (const logicalTileId of animatedLogicalTileIds(tileset)) {
        const key = tileAnimationClockKey(tilesetId, logicalTileId);
        const elapsed = (this.elapsed.get(key) ?? 0) + step;
        this.elapsed.set(key, elapsed);
        const frame = resolveAnimatedTileFrame(tileset, logicalTileId, elapsed);
        const previous = this.lastFrame.get(key);
        this.lastFrame.set(key, frame);
        if (previous === undefined) {
          const before = resolveAnimatedTileFrame(
            tileset,
            logicalTileId,
            Math.max(0, elapsed - step),
          );
          if (before !== frame) {
            changed.add(key);
          }
        } else if (previous !== frame) {
          changed.add(key);
        }
      }
    }
    this.lastChanged = changed;
    if (changed.size > 0) {
      for (const listener of this.listeners) {
        listener(changed);
      }
    }
    return changed;
  }
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

let sharedClock = new TileAnimationClock();

export function sharedTileAnimationClock(): TileAnimationClock {
  return sharedClock;
}

/** Test helper: replace the process-wide clock. */
export function resetSharedTileAnimationClock(): TileAnimationClock {
  sharedClock = new TileAnimationClock();
  return sharedClock;
}
