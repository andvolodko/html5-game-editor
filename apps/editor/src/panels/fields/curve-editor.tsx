import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParticleCurve, ParticleCurvePoint } from "@game-editor/scene";
import { INSPECTOR_NUMBER_DECIMALS } from "./format-inspector-number";
import { InspectorFieldRow, NumberField } from "./inspector-fields";

const MIN_POINTS = 2;
const CURVE_WIDTH = 220;
const CURVE_HEIGHT = 80;
const POINT_RADIUS = 5;
const PAD = 8;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function roundCurveNumber(value: number): number {
  return Number(value.toFixed(INSPECTOR_NUMBER_DECIMALS));
}

function sortPoints(points: ParticleCurvePoint[]): ParticleCurvePoint[] {
  return [...points].sort((a, b) => a.time - b.time);
}

function toSvg(
  point: ParticleCurvePoint,
  minValue: number,
  maxValue: number,
): { x: number; y: number } {
  const range = maxValue - minValue || 1;
  return {
    x: PAD + point.time * (CURVE_WIDTH - PAD * 2),
    y:
      PAD +
      (1 - (point.value - minValue) / range) * (CURVE_HEIGHT - PAD * 2),
  };
}

function fromSvg(
  x: number,
  y: number,
  minValue: number,
  maxValue: number,
): ParticleCurvePoint {
  const range = maxValue - minValue || 1;
  const time = clamp01((x - PAD) / (CURVE_WIDTH - PAD * 2));
  const value =
    minValue +
    (1 - clamp01((y - PAD) / (CURVE_HEIGHT - PAD * 2))) * range;
  return {
    time: roundCurveNumber(time),
    value: roundCurveNumber(value),
  };
}

export function CurveEditor({
  label,
  value,
  minValue = 0,
  maxValue = 1,
  onChange,
  onPreview,
}: {
  label: string;
  value: ParticleCurve;
  minValue?: number;
  maxValue?: number;
  /** Commit (one undo). Called on pointer-up / add / delete. */
  onChange: (next: ParticleCurve) => void;
  /** Live preview while dragging (no undo). */
  onPreview?: (next: ParticleCurve) => void;
}) {
  const [selected, setSelected] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) {
      setDraft(value);
      draftRef.current = value;
    }
  }, [value]);

  const points = useMemo(() => sortPoints(draft.points), [draft.points]);
  const path = useMemo(() => {
    if (points.length === 0) {
      return "";
    }
    return points
      .map((point, index) => {
        const { x, y } = toSvg(point, minValue, maxValue);
        return `${index === 0 ? "M" : "L"}${String(x)} ${String(y)}`;
      })
      .join(" ");
  }, [points, minValue, maxValue]);

  const emit = useCallback(
    (nextPoints: ParticleCurvePoint[], preview: boolean) => {
      const next = { points: sortPoints(nextPoints) };
      draftRef.current = next;
      setDraft(next);
      if (preview) {
        onPreview?.(next);
      } else {
        onChange(next);
      }
    },
    [onChange, onPreview],
  );

  const onPointerDown = (
    event: React.PointerEvent<Element>,
    index: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(index);
    dragIndex.current = index;
    dragging.current = true;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex.current === null) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const nextPoint = fromSvg(localX, localY, minValue, maxValue);
    const next = points.map((point, i) =>
      i === dragIndex.current ? nextPoint : point,
    );
    emit(next, true);
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex.current === null) {
      return;
    }
    dragIndex.current = null;
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    onChange({ points: sortPoints(draftRef.current.points) });
  };

  const addPoint = () => {
    const time = 0.5;
    const midValue = (minValue + maxValue) / 2;
    emit([...points, { time, value: midValue }], false);
    setSelected(points.length);
  };

  const deletePoint = () => {
    if (points.length <= MIN_POINTS) {
      return;
    }
    const index = Math.min(selected, points.length - 1);
    const next = points.filter((_, i) => i !== index);
    emit(next, false);
    setSelected(Math.max(0, index - 1));
  };

  const selectedPoint = points[Math.min(selected, points.length - 1)];

  return (
    <div className="curve-editor">
      <div className="inspector-field-row">
        <span>{label}</span>
        <button type="button" onClick={addPoint}>
          Add
        </button>
        <button
          type="button"
          onClick={deletePoint}
          disabled={points.length <= MIN_POINTS}
        >
          Delete
        </button>
      </div>
      <svg
        width={CURVE_WIDTH}
        height={CURVE_HEIGHT}
        className="curve-editor-svg"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <rect
          x={0}
          y={0}
          width={CURVE_WIDTH}
          height={CURVE_HEIGHT}
          fill="var(--inspector-input-bg, #1e1e1e)"
          stroke="var(--inspector-border, #444)"
        />
        <path d={path} fill="none" stroke="#6cb6ff" strokeWidth={2} />
        {points.map((point, index) => {
          const { x, y } = toSvg(point, minValue, maxValue);
          return (
            <circle
              key={`${String(point.time)}-${String(index)}`}
              cx={x}
              cy={y}
              r={POINT_RADIUS}
              fill={index === selected ? "#ffe066" : "#6cb6ff"}
              onPointerDown={(event) => onPointerDown(event, index)}
            />
          );
        })}
      </svg>
      {selectedPoint ? (
        <InspectorFieldRow>
          <NumberField
            label="Time"
            value={selectedPoint.time}
            onCommit={(time) => {
              const next = points.map((point, i) =>
                i === selected ? { ...point, time: clamp01(time) } : point,
              );
              emit(next, false);
            }}
          />
          <NumberField
            label="Value"
            value={selectedPoint.value}
            onCommit={(nextValue) => {
              const next = points.map((point, i) =>
                i === selected ? { ...point, value: nextValue } : point,
              );
              emit(next, false);
            }}
          />
        </InspectorFieldRow>
      ) : null}
    </div>
  );
}
