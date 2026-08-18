import {
  HIT_ZONE_POLYGON_MIN_POINTS,
  insertHitZonePolygonPointOnEdge,
  removeHitZonePolygonPoint,
  type GraphicsShapeData,
  type Vec2,
} from "@game-editor/scene";
import { InspectorFieldRow, NumberField } from "./fields/inspector-fields";

export function PolygonPointsEditor({
  points,
  overridden,
  onChange,
}: {
  points: Vec2[];
  overridden?: boolean;
  onChange: (points: Vec2[]) => void;
}) {
  const shape: GraphicsShapeData = { type: "polygon", points };
  return (
    <div className="inspector-polygon-points">
      {points.map((point, index) => (
        <div className="inspector-polygon-point" key={index}>
          <InspectorFieldRow>
            <NumberField
              label={`${index} X`}
              value={point.x}
              overridden={overridden}
              onCommit={(x) => {
                const next = points.map((existing, i) =>
                  i === index ? { x, y: existing.y } : existing,
                );
                onChange(next);
              }}
            />
            <NumberField
              label={`${index} Y`}
              value={point.y}
              overridden={overridden}
              onCommit={(y) => {
                const next = points.map((existing, i) =>
                  i === index ? { x: existing.x, y } : existing,
                );
                onChange(next);
              }}
            />
          </InspectorFieldRow>
          <button
            type="button"
            className="inspector-remove-btn"
            disabled={points.length <= HIT_ZONE_POLYGON_MIN_POINTS}
            onClick={() => {
              const next = removeHitZonePolygonPoint(shape, index);
              if (next.type === "polygon") {
                onChange(next.points);
              }
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="add-component-btn"
        onClick={() => {
          const next = insertHitZonePolygonPointOnEdge(shape, points.length - 1);
          if (next.type === "polygon") {
            onChange(next.points);
          }
        }}
      >
        Add point
      </button>
      <p className="panel-hint">
        Drag vertices in the viewport. Click an edge dot to insert a point.
        Right-click a vertex to remove it.
      </p>
    </div>
  );
}
