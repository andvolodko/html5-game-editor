import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ParticleColorGradient,
  ParticleColorPoint,
} from "@game-editor/scene";
import { INSPECTOR_NUMBER_DECIMALS } from "./format-inspector-number";
import { InspectorFieldRow, NumberField } from "./inspector-fields";

const MIN_STOPS = 2;
const BAR_WIDTH = 220;
const BAR_HEIGHT = 24;
const HANDLE_SIZE = 10;
const PAD = 6;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function roundStopTime(value: number): number {
  return Number(value.toFixed(INSPECTOR_NUMBER_DECIMALS));
}

function sortStops(points: ParticleColorPoint[]): ParticleColorPoint[] {
  return [...points].sort((a, b) => a.time - b.time);
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function fromHex(hex: string): number {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return Number.isFinite(value) ? value : 0xffffff;
}

function cssGradient(points: ParticleColorPoint[]): string {
  const sorted = sortStops(points);
  if (sorted.length === 0) {
    return "#ffffff";
  }
  return `linear-gradient(90deg, ${sorted
    .map((p) => `${toHex(p.color)} ${String(p.time * 100)}%`)
    .join(", ")})`;
}

export function ColorGradientEditor({
  label,
  value,
  onChange,
  onPreview,
}: {
  label: string;
  value: ParticleColorGradient;
  onChange: (next: ParticleColorGradient) => void;
  onPreview?: (next: ParticleColorGradient) => void;
}) {
  const [selected, setSelected] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const draftRef = useRef(value);
  draftRef.current = value;

  const points = useMemo(() => sortStops(value.points), [value.points]);

  const emit = useCallback(
    (nextPoints: ParticleColorPoint[], preview: boolean) => {
      const next = { points: sortStops(nextPoints) };
      if (preview) {
        onPreview?.(next);
      } else {
        onChange(next);
      }
    },
    [onChange, onPreview],
  );

  const onBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const time = roundStopTime(
      clamp01((event.clientX - rect.left - PAD) / (BAR_WIDTH - PAD * 2)),
    );
    // Prefer dragging nearest handle
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i += 1) {
      const d = Math.abs(points[i]!.time - time);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    if (best < 0.05) {
      setSelected(nearest);
      dragIndex.current = nearest;
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const color = points[selected]?.color ?? 0xffffff;
    const next = [...points, { time, color }];
    emit(next, false);
    setSelected(next.length - 1);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragIndex.current === null) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const time = roundStopTime(
      clamp01((event.clientX - rect.left - PAD) / (BAR_WIDTH - PAD * 2)),
    );
    const next = points.map((point, i) =>
      i === dragIndex.current ? { ...point, time } : point,
    );
    emit(next, true);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragIndex.current === null) {
      return;
    }
    dragIndex.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    onChange({ points: sortStops(draftRef.current.points) });
  };

  const deleteStop = () => {
    if (points.length <= MIN_STOPS) {
      return;
    }
    const index = Math.min(selected, points.length - 1);
    emit(
      points.filter((_, i) => i !== index),
      false,
    );
    setSelected(Math.max(0, index - 1));
  };

  const selectedPoint = points[Math.min(selected, points.length - 1)];

  return (
    <div className="color-gradient-editor">
      <div className="inspector-field-row">
        <span>{label}</span>
        <button
          type="button"
          onClick={deleteStop}
          disabled={points.length <= MIN_STOPS}
        >
          Delete Stop
        </button>
      </div>
      <div
        className="color-gradient-bar"
        style={{
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          background: cssGradient(points),
          position: "relative",
          borderRadius: 4,
          border: "1px solid var(--inspector-border, #444)",
        }}
        onPointerDown={onBarPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {points.map((point, index) => (
          <button
            key={`${String(point.time)}-${String(index)}`}
            type="button"
            aria-label={`Color stop ${String(index + 1)}`}
            style={{
              position: "absolute",
              left: PAD + point.time * (BAR_WIDTH - PAD * 2) - HANDLE_SIZE / 2,
              top: (BAR_HEIGHT - HANDLE_SIZE) / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              borderRadius: "50%",
              border:
                index === selected ? "2px solid #ffe066" : "2px solid #fff",
              background: toHex(point.color),
              padding: 0,
              cursor: "ew-resize",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              setSelected(index);
              dragIndex.current = index;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          />
        ))}
      </div>
      {selectedPoint ? (
        <InspectorFieldRow>
          <NumberField
            label="Time"
            value={selectedPoint.time}
            onCommit={(time) => {
              emit(
                points.map((point, i) =>
                  i === selected ? { ...point, time: clamp01(time) } : point,
                ),
                false,
              );
            }}
          />
          <label>
            Color
            <input
              type="color"
              value={toHex(selectedPoint.color)}
              onChange={(event) => {
                emit(
                  points.map((point, i) =>
                    i === selected
                      ? { ...point, color: fromHex(event.target.value) }
                      : point,
                  ),
                  false,
                );
              }}
            />
          </label>
        </InspectorFieldRow>
      ) : null}
    </div>
  );
}
