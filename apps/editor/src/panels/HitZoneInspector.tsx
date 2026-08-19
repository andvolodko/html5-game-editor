import type { Editor } from "@game-editor/editor-core";
import {
  defaultGraphicsShape,
  getHitZone,
  getHitZoneOffset,
  getTransform2D,
  isHitZoneEnabled,
  type GraphicsShapeData,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";
import { isInspectorPropertyOverridden } from "./prefab-override-flag";
import {
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

interface Props {
  editor: Editor;
  scene: SceneData;
  node: SceneNodeData;
}

export function HitZoneInspector({ editor, scene, node }: Props) {
  if (!getTransform2D(node)) {
    return null;
  }
  const hitZone = getHitZone(node);
  if (!hitZone) {
    return (
      <section className="inspector-section">
        <h3>Hit Zone</h3>
        <button
          type="button"
          className="add-component-btn"
          onClick={() => editor.addHitZone(node.id)}
        >
          Add Hit Zone
        </button>
      </section>
    );
  }

  const offset = getHitZoneOffset(hitZone);
  const shape = hitZone.shape;
  const overridden = (path: string) =>
    isInspectorPropertyOverridden(scene, node, hitZone.id, path);

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3>Hit Zone</h3>
        <InspectorComponentHeaderActions
          onCopy={() => editor.copyComponent(node.id, hitZone.id)}
          onRemove={() => editor.removeComponent(node.id, hitZone.id)}
        />
      </div>
      <div className="inspector-grid">
        <BooleanField
          label="Enabled"
          value={isHitZoneEnabled(hitZone)}
          overridden={overridden("enabled")}
          onCommit={(enabled) => editor.setHitZone(node.id, { enabled })}
        />
        <InspectorFieldRow>
          <NumberField
            label="Offset X"
            value={offset.x}
            overridden={overridden("offset")}
            onCommit={(x) =>
              editor.setHitZone(node.id, { offset: { x, y: offset.y } })
            }
          />
          <NumberField
            label="Offset Y"
            value={offset.y}
            overridden={overridden("offset")}
            onCommit={(y) =>
              editor.setHitZone(node.id, { offset: { x: offset.x, y } })
            }
          />
        </InspectorFieldRow>
        <EnumField
          label="Shape"
          value={shape.type}
          options={SHAPE_TYPES}
          overridden={overridden("shape")}
          onCommit={(type) =>
            editor.setHitZone(node.id, { shape: defaultGraphicsShape(type) })
          }
        />
        {shape.type === "rectangle" ||
        shape.type === "rounded-rectangle" ||
        shape.type === "ellipse" ? (
          <InspectorFieldRow>
            <NumberField
              label="Width"
              value={shape.width}
              overridden={overridden("shape")}
              onCommit={(width) =>
                editor.setHitZone(node.id, { shape: { ...shape, width } })
              }
            />
            <NumberField
              label="Height"
              value={shape.height}
              overridden={overridden("shape")}
              onCommit={(height) =>
                editor.setHitZone(node.id, { shape: { ...shape, height } })
              }
            />
          </InspectorFieldRow>
        ) : null}
        {"radius" in shape ? (
          <NumberField
            label="Radius"
            value={shape.radius}
            overridden={overridden("shape")}
            onCommit={(radius) =>
              editor.setHitZone(node.id, { shape: { ...shape, radius } })
            }
          />
        ) : null}
        {shape.type === "polygon" ? (
          <PolygonPointsEditor
            points={shape.points}
            overridden={overridden("shape")}
            onChange={(points) =>
              editor.setHitZone(node.id, { shape: { type: "polygon", points } })
            }
          />
        ) : null}
      </div>
    </section>
  );
}
