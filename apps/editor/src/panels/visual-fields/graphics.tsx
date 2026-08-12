import type { GraphicsShapeData, VisualComponentData } from "@game-editor/scene";
import {
  DEFAULT_GRAPHICS_CIRCLE_RADIUS,
  DEFAULT_GRAPHICS_ELLIPSE_HEIGHT,
  DEFAULT_GRAPHICS_ELLIPSE_WIDTH,
  DEFAULT_GRAPHICS_ROUNDED_RADIUS,
  DEFAULT_GRAPHICS_SIZE,
  DEFAULT_GRAPHICS_TRIANGLE_EXTENT,
} from "@game-editor/scene";
import {
  ColorField,
  EnumField,
  NumberField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

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
        options={[
          "rectangle",
          "rounded-rectangle",
          "circle",
          "ellipse",
          "polygon",
        ]}
        onCommit={(type) => {
          commit({ shape: defaultShape(type as GraphicsShapeData["type"]) });
        }}
      />
      {"width" in shape ? (
        <NumberField
          label="Width"
          value={shape.width}
          onCommit={(width) => commit({ shape: { ...shape, width } })}
        />
      ) : null}
      {"height" in shape ? (
        <NumberField
          label="Height"
          value={shape.height}
          onCommit={(height) => commit({ shape: { ...shape, height } })}
        />
      ) : null}
      {"radius" in shape ? (
        <NumberField
          label="Radius"
          value={shape.radius}
          onCommit={(radius) => commit({ shape: { ...shape, radius } })}
        />
      ) : null}
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
    </>
  );
}

function defaultShape(type: GraphicsShapeData["type"]): GraphicsShapeData {
  switch (type) {
    case "rectangle":
      return {
        type,
        width: DEFAULT_GRAPHICS_SIZE,
        height: DEFAULT_GRAPHICS_SIZE,
      };
    case "rounded-rectangle":
      return {
        type,
        width: DEFAULT_GRAPHICS_SIZE,
        height: DEFAULT_GRAPHICS_SIZE,
        radius: DEFAULT_GRAPHICS_ROUNDED_RADIUS,
      };
    case "circle":
      return { type, radius: DEFAULT_GRAPHICS_CIRCLE_RADIUS };
    case "ellipse":
      return {
        type,
        width: DEFAULT_GRAPHICS_ELLIPSE_WIDTH,
        height: DEFAULT_GRAPHICS_ELLIPSE_HEIGHT,
      };
    case "polygon": {
      const e = DEFAULT_GRAPHICS_TRIANGLE_EXTENT;
      return {
        type,
        points: [
          { x: 0, y: -e },
          { x: e, y: e },
          { x: -e, y: e },
        ],
      };
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
