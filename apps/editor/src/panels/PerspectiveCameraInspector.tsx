import type { Editor } from "@game-editor/editor-core";
import {
  getPerspectiveCamera,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  BooleanField,
  InspectorFieldRow,
  NumberField,
} from "./fields/inspector-fields";

interface Props {
  editor: Editor;
  node: SceneNodeData;
}

export function PerspectiveCameraInspector({ editor, node }: Props) {
  const camera = getPerspectiveCamera(node);
  if (!camera) {
    return null;
  }

  return (
    <section className="inspector-section">
      <h3>Perspective Camera</h3>
      <div className="inspector-grid">
        <InspectorFieldRow>
          <NumberField
            label="FOV"
            value={camera.fov}
            onCommit={(fov) => {
              if (fov > 0) {
                editor.setPerspectiveCamera(node.id, { fov });
              }
            }}
          />
          <BooleanField
            label="Active"
            value={camera.active === true}
            onCommit={(active) => {
              editor.setPerspectiveCamera(node.id, {
                active: active ? true : undefined,
              });
            }}
          />
        </InspectorFieldRow>
        <InspectorFieldRow>
          <NumberField
            label="Near"
            value={camera.near}
            onCommit={(near) => {
              if (near > 0) {
                editor.setPerspectiveCamera(node.id, { near });
              }
            }}
          />
          <NumberField
            label="Far"
            value={camera.far}
            onCommit={(far) => {
              if (far > 0) {
                editor.setPerspectiveCamera(node.id, { far });
              }
            }}
          />
        </InspectorFieldRow>
      </div>
    </section>
  );
}
