import type { Editor } from "@game-editor/editor-core";
import {
  getModel3D,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  NumberField,
  OptionalSelectField,
} from "./fields/inspector-fields";

interface Props {
  editor: Editor;
  node: SceneNodeData;
}

export function Model3DInspector({ editor, node }: Props) {
  const model = getModel3D(node);
  if (!model) {
    return null;
  }

  const asset = model.assetId ? editor.assets.get(model.assetId) : undefined;
  const animations =
    asset?.metadata.kind === "gltf" ? asset.metadata.animations : [];
  const animationOptions =
    model.animation && !animations.includes(model.animation)
      ? [model.animation, ...animations]
      : animations;

  return (
    <section className="inspector-section">
      <h3>Model3D</h3>
      <div className="inspector-grid">
        <AssetSelectField
          label="glTF Asset"
          value={model.assetId}
          kind="gltf"
          onCommit={(assetId) => {
            editor.setModel3D(node.id, { assetId });
          }}
        />
        <OptionalSelectField
          label="Animation"
          value={model.animation}
          options={animationOptions}
          emptyLabel="(first clip)"
          onCommit={(animation) => {
            editor.setModel3D(node.id, { animation });
          }}
        />
        <BooleanField
          label="Playing"
          value={model.playing}
          onCommit={(playing) => {
            editor.setModel3D(node.id, { playing });
          }}
        />
        <BooleanField
          label="Loop"
          value={model.loop}
          onCommit={(loop) => {
            editor.setModel3D(node.id, { loop });
          }}
        />
        <NumberField
          label="Time Scale"
          value={model.timeScale}
          onCommit={(timeScale) => {
            if (timeScale > 0) {
              editor.setModel3D(node.id, { timeScale });
            }
          }}
        />
      </div>
    </section>
  );
}
