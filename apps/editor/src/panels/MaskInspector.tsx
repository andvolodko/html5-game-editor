import type { Editor } from "@game-editor/editor-core";
import { rasterAssetDisplaySize } from "@game-editor/assets";
import {
  defaultGraphicsShape,
  defaultMaskShapeForNode,
  getMask,
  getMaskOffset,
  getMaskShape,
  getMaskSpriteSize,
  getTransform2D,
  isMaskEnabled,
  isMaskInverse,
  type GraphicsShapeData,
  type MaskMode,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";
import { isInspectorPropertyOverridden } from "./prefab-override-flag";
import {
  AssetSelectField,
  BooleanField,
  EnumField,
  InspectorFieldRow,
  NumberField,
} from "./fields/inspector-fields";
import { PolygonPointsEditor } from "./PolygonPointsEditor";
import { InspectorComponentHeaderActions } from "./InspectorComponentHeaderActions";

const SHAPE_TYPES: readonly GraphicsShapeData["type"][] = [
  "rectangle",
  "rounded-rectangle",
  "circle",
  "ellipse",
  "polygon",
];

const MASK_MODES: readonly MaskMode[] = ["shape", "sprite"];

interface Props {
  editor: Editor;
  scene: SceneData;
  node: SceneNodeData;
}

export function MaskInspector({ editor, scene, node }: Props) {
  if (!getTransform2D(node)) {
    return null;
  }
  const mask = getMask(node);
  if (!mask) {
    return (
      <section className="inspector-section">
        <h3>Mask</h3>
        <button
          type="button"
          className="add-component-btn"
          onClick={() => editor.addMask(node.id)}
        >
          Add Mask
        </button>
      </section>
    );
  }

  const offset = getMaskOffset(mask);
  const shape = getMaskShape(mask);
  const spriteSize = getMaskSpriteSize(mask);
  const overridden = (path: string) =>
    isInspectorPropertyOverridden(scene, node, mask.id, path);

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3>Mask</h3>
        <InspectorComponentHeaderActions
          onCopy={() => editor.copyComponent(node.id, mask.id)}
          onRemove={() => editor.removeComponent(node.id, mask.id)}
        />
      </div>
      <div className="inspector-grid">
        <BooleanField
          label="Enabled"
          value={isMaskEnabled(mask)}
          overridden={overridden("enabled")}
          onCommit={(enabled) => editor.setMask(node.id, { enabled })}
        />
        <BooleanField
          label="Inverse"
          value={isMaskInverse(mask)}
          overridden={overridden("inverse")}
          onCommit={(inverse) => editor.setMask(node.id, { inverse })}
        />
        <InspectorFieldRow>
          <NumberField
            label="Offset X"
            value={offset.x}
            overridden={overridden("offset")}
            onCommit={(x) =>
              editor.setMask(node.id, { offset: { x, y: offset.y } })
            }
          />
          <NumberField
            label="Offset Y"
            value={offset.y}
            overridden={overridden("offset")}
            onCommit={(y) =>
              editor.setMask(node.id, { offset: { x: offset.x, y } })
            }
          />
        </InspectorFieldRow>
        <EnumField
          label="Mode"
          value={mask.mode}
          options={MASK_MODES}
          overridden={overridden("mode")}
          onCommit={(mode) => {
            if (mode === "shape") {
              editor.setMask(node.id, {
                mode: "shape",
                shape: mask.shape ?? defaultMaskShapeForNode(node),
              });
              return;
            }
            editor.setMask(node.id, { mode: "sprite" });
          }}
        />
        {mask.mode === "shape" && shape ? (
          <ShapeMaskFields
            shape={shape}
            overridden={overridden("shape")}
            onCommit={(next) => editor.setMask(node.id, { shape: next })}
          />
        ) : null}
        {mask.mode === "sprite" ? (
          <>
            <AssetSelectField
              label="Texture"
              kind={["texture", "aseprite"]}
              value={mask.assetId}
              onCommit={(assetId) => {
                const next = assetId ? editor.assets.get(assetId) : undefined;
                const size = next ? rasterAssetDisplaySize(next) : undefined;
                editor.setMask(node.id, {
                  assetId,
                  ...(size ?? {}),
                });
              }}
            />
            <InspectorFieldRow>
              <NumberField
                label="Width"
                value={spriteSize.width}
                overridden={overridden("width")}
                onCommit={(width) => editor.setMask(node.id, { width })}
              />
              <NumberField
                label="Height"
                value={spriteSize.height}
                overridden={overridden("height")}
                onCommit={(height) => editor.setMask(node.id, { height })}
              />
            </InspectorFieldRow>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ShapeMaskFields({
  shape,
  overridden,
  onCommit,
}: {
  shape: GraphicsShapeData;
  overridden: boolean;
  onCommit: (shape: GraphicsShapeData) => void;
}) {
  return (
    <>
      <EnumField
        label="Shape"
        value={shape.type}
        options={SHAPE_TYPES}
        overridden={overridden}
        onCommit={(type) => onCommit(defaultGraphicsShape(type))}
      />
      {shape.type === "rectangle" ||
      shape.type === "rounded-rectangle" ||
      shape.type === "ellipse" ? (
        <InspectorFieldRow>
          <NumberField
            label="Width"
            value={shape.width}
            overridden={overridden}
            onCommit={(width) => onCommit({ ...shape, width })}
          />
          <NumberField
            label="Height"
            value={shape.height}
            overridden={overridden}
            onCommit={(height) => onCommit({ ...shape, height })}
          />
        </InspectorFieldRow>
      ) : null}
      {"radius" in shape ? (
        <NumberField
          label="Radius"
          value={shape.radius}
          overridden={overridden}
          onCommit={(radius) => onCommit({ ...shape, radius })}
        />
      ) : null}
      {shape.type === "polygon" ? (
        <PolygonPointsEditor
          points={shape.points}
          overridden={overridden}
          onChange={(points) => onCommit({ type: "polygon", points })}
        />
      ) : null}
    </>
  );
}
