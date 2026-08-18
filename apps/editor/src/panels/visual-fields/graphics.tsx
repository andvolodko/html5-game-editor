import type { GraphicsShapeData, VisualComponentData } from "@game-editor/scene";
import { defaultGraphicsShape } from "@game-editor/scene";
import {
  ColorField,
  EnumField,
  InspectorFieldRow,
  NumberField,
} from "../fields/inspector-fields";
import { PolygonPointsEditor } from "../PolygonPointsEditor";
import type { VisualCommit } from "./types";

const SHAPE_TYPES: readonly GraphicsShapeData["type"][] = [
  "rectangle",
  "rounded-rectangle",
  "circle",
  "ellipse",
  "polygon",
];

export function GraphicsFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "Graphics" }>;
  commit: VisualCommit;
}) {
  const shape = visual.shape;
  return (
    <>
      <EnumField
        label="Shape"
        value={shape.type}
        options={SHAPE_TYPES}
        onCommit={(type) => {
          commit({ shape: defaultGraphicsShape(type) });
        }}
      />
      {shape.type === "rectangle" ||
      shape.type === "rounded-rectangle" ||
      shape.type === "ellipse" ? (
        <InspectorFieldRow>
          <NumberField
            label="Width"
            value={shape.width}
            onCommit={(width) => commit({ shape: { ...shape, width } })}
          />
          <NumberField
            label="Height"
            value={shape.height}
            onCommit={(height) => commit({ shape: { ...shape, height } })}
          />
        </InspectorFieldRow>
      ) : null}
      {"radius" in shape ? (
        <NumberField
          label="Radius"
          value={shape.radius}
          onCommit={(radius) => commit({ shape: { ...shape, radius } })}
        />
      ) : null}
      {shape.type === "polygon" ? (
        <PolygonPointsEditor
          points={shape.points}
          onChange={(points) => commit({ shape: { type: "polygon", points } })}
        />
      ) : null}
      <InspectorFieldRow>
        <ColorField
          label="Fill Color"
          value={visual.fillColor}
          onCommit={(fillColor) => commit({ fillColor })}
        />
        <NumberField
          label="Fill Alpha"
          value={visual.fillAlpha}
          onCommit={(fillAlpha) => commit({ fillAlpha })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <ColorField
          label="Stroke Color"
          value={visual.strokeColor}
          onCommit={(strokeColor) => commit({ strokeColor })}
        />
        <NumberField
          label="Stroke Alpha"
          value={visual.strokeAlpha}
          onCommit={(strokeAlpha) => commit({ strokeAlpha })}
        />
        <NumberField
          label="Stroke Width"
          value={visual.strokeWidth}
          onCommit={(strokeWidth) => commit({ strokeWidth })}
        />
      </InspectorFieldRow>
    </>
  );
}
