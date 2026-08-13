import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
  ScriptPerformanceStats,
  ScriptRendererDrawStats,
} from "../types.js";

const MS_PER_SECOND = 1000;
const DEFAULT_REFRESH_INTERVAL_MS = 250;
const DEFAULT_ENABLED = true;
const FPS_SMOOTHING = 0.15;
const TIME_DECIMAL_PLACES = 2;
const MIN_LABEL_COLUMN_WIDTH = 18;
const LABEL_VALUE_GAP = 1;

const EMPTY_STATS: ScriptPerformanceStats = {
  frameTimeMs: 0,
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  gameLogicMs: 0,
  rendererMs: 0,
  canvas: 0,
  displayObjects: 0,
};

type Props = {
  enabled: boolean;
  refreshIntervalMs: number;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    enabled:
      typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_ENABLED,
    refreshIntervalMs:
      typeof raw.refreshIntervalMs === "number" && raw.refreshIntervalMs > 0
        ? raw.refreshIntervalMs
        : DEFAULT_REFRESH_INTERVAL_MS,
  };
}

function formatFixed(value: number, digits: number): string {
  return value.toFixed(digits);
}

type MeterRow = { label: string; value: string };

function graphRows(
  prefix: string,
  slice: ScriptRendererDrawStats,
): MeterRow[] {
  const label = prefix.length > 0 ? `${prefix} ` : "";
  return [
    { label: `${label}Draw call`.trimStart(), value: String(Math.round(slice.drawCalls)) },
    { label: `${label}Triangle`.trimStart(), value: String(Math.round(slice.triangles)) },
    {
      label: `${label}Display Objects`.trimStart(),
      value: String(Math.round(slice.displayObjects)),
    },
  ];
}

function formatMeterRows(rows: readonly MeterRow[]): string {
  let width = MIN_LABEL_COLUMN_WIDTH;
  for (const row of rows) {
    const needed = row.label.length + LABEL_VALUE_GAP;
    if (needed > width) {
      width = needed;
    }
  }
  return rows
    .map((row) => `${row.label.padEnd(width, " ")}${row.value}`)
    .join("\n");
}

/** Builds the Cocos-style performance overlay string. */
export function formatPerformanceMeterText(
  stats: ScriptPerformanceStats,
): string {
  const drawRows =
    stats.pixi !== undefined || stats.three !== undefined
      ? [
          ...(stats.pixi ? graphRows("Pixi", stats.pixi) : []),
          ...(stats.three ? graphRows("Three", stats.three) : []),
        ]
      : graphRows("", {
          drawCalls: stats.drawCalls,
          triangles: stats.triangles,
          displayObjects: stats.displayObjects,
          canvas: stats.canvas,
        });
  return formatMeterRows([
    {
      label: "Frame time (ms)",
      value: formatFixed(stats.frameTimeMs, TIME_DECIMAL_PLACES),
    },
    {
      label: "Framerate (FPS)",
      value: formatFixed(stats.fps, TIME_DECIMAL_PLACES),
    },
    ...drawRows,
    {
      label: "Game Logic (ms)",
      value: formatFixed(stats.gameLogicMs, TIME_DECIMAL_PLACES),
    },
    {
      label: "Renderer (ms)",
      value: formatFixed(stats.rendererMs, TIME_DECIMAL_PLACES),
    },
    { label: "Canvas", value: String(Math.round(stats.canvas)) },
  ]);
}

/**
 * Writes live FPS / draw stats onto the host node's Text / HTMLText / BitmapText.
 * Add to a text node in play/preview; requires host `setText` (+ optional stats).
 */
export class PerformanceMeterBehaviour implements ScriptInstance {
  private readonly props: Props;
  private elapsedSinceRefreshMs = 0;
  private smoothedFps = 0;
  private lastText = "";

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
  }

  update(dt: number): void {
    if (!this.props.enabled || dt <= 0) {
      return;
    }

    const setText = this.ctx.services.setText;
    if (!setText) {
      return;
    }

    const frameTimeMs = dt * MS_PER_SECOND;
    const instantFps = MS_PER_SECOND / frameTimeMs;
    this.smoothedFps =
      this.smoothedFps <= 0
        ? instantFps
        : this.smoothedFps + (instantFps - this.smoothedFps) * FPS_SMOOTHING;

    this.elapsedSinceRefreshMs += frameTimeMs;
    if (this.elapsedSinceRefreshMs < this.props.refreshIntervalMs) {
      return;
    }
    this.elapsedSinceRefreshMs = 0;

    const hostStats = this.ctx.services.getPerformanceStats?.() ?? EMPTY_STATS;
    const gameLogicMs = hostStats.gameLogicMs;
    const stats: ScriptPerformanceStats = {
      frameTimeMs,
      fps: this.smoothedFps,
      drawCalls: hostStats.drawCalls,
      triangles: hostStats.triangles,
      displayObjects: hostStats.displayObjects,
      gameLogicMs,
      rendererMs:
        hostStats.rendererMs > 0
          ? hostStats.rendererMs
          : Math.max(0, frameTimeMs - gameLogicMs),
      canvas: hostStats.canvas,
      pixi: hostStats.pixi,
      three: hostStats.three,
    };

    const nextText = formatPerformanceMeterText(stats);
    if (nextText === this.lastText) {
      return;
    }
    this.lastText = nextText;
    setText(this.ctx.nodeId, nextText);
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  enabled: { kind: "boolean", default: DEFAULT_ENABLED },
  refreshIntervalMs: {
    kind: "number",
    default: DEFAULT_REFRESH_INTERVAL_MS,
    min: 16,
    step: 16,
  },
};

export const performanceMeterComponent = defineComponent({
  id: "shared.PerformanceMeter",
  displayName: "Performance Meter",
  category: "Debug",
  categoryOrder: 40,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new PerformanceMeterBehaviour(ctx),
});
