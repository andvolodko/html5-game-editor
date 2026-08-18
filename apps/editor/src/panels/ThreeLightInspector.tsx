import type { Editor } from "@game-editor/editor-core";
import {
  getAmbientLight,
  getDirectionalLight,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  ColorField,
  InspectorFieldRow,
  NumberField,
} from "./fields/inspector-fields";

interface Props {
  editor: Editor;
  node: SceneNodeData;
}

export function DirectionalLightInspector({ editor, node }: Props) {
  const light = getDirectionalLight(node);
  if (!light) {
    return null;
  }

  return (
    <section className="inspector-section">
      <h3>Directional Light</h3>
      <div className="inspector-grid">
        <InspectorFieldRow>
          <ColorField
            label="Color"
            value={light.color}
            onCommit={(color) => {
              editor.setDirectionalLight(node.id, { color });
            }}
          />
          <NumberField
            label="Intensity"
            value={light.intensity}
            onCommit={(intensity) => {
              if (intensity >= 0) {
                editor.setDirectionalLight(node.id, { intensity });
              }
            }}
          />
        </InspectorFieldRow>
      </div>
    </section>
  );
}

export function AmbientLightInspector({ editor, node }: Props) {
  const light = getAmbientLight(node);
  if (!light) {
    return null;
  }

  return (
    <section className="inspector-section">
      <h3>Ambient Light</h3>
      <div className="inspector-grid">
        <InspectorFieldRow>
          <ColorField
            label="Color"
            value={light.color}
            onCommit={(color) => {
              editor.setAmbientLight(node.id, { color });
            }}
          />
          <NumberField
            label="Intensity"
            value={light.intensity}
            onCommit={(intensity) => {
              if (intensity >= 0) {
                editor.setAmbientLight(node.id, { intensity });
              }
            }}
          />
        </InspectorFieldRow>
      </div>
    </section>
  );
}
