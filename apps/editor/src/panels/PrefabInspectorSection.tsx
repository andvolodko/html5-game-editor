import {
  findPrefabInstanceRoot,
  getPrefabInstanceOverrides,
  isPrefabInstanceRoot,
  type PrefabOverride,
  type SceneNodeData,
} from "@game-editor/scene";
import { useAssetPreviewSelection } from "../assets/asset-preview-selection";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";

export function PrefabInspectorSection({ node }: { node: SceneNodeData }) {
  const editor = useEditor();
  const { setSelectedAssetId } = useAssetPreviewSelection();
  const scene = useEditorState((ed) => ed.getScene());
  const root = isPrefabInstanceRoot(node)
    ? node
    : findPrefabInstanceRoot(scene, node.id);
  if (!root?.prefab) {
    return null;
  }
  const missing = editor.prefabs.get(root.prefab.prefabAssetId) === undefined;
  const asset = editor.assets.get(root.prefab.prefabAssetId);
  const overrides = getPrefabInstanceOverrides(root);
  const pathLabel = prefabPathLabel(root, node);

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3>Prefab</h3>
      </div>
      {missing ? (
        <p className="panel-hint prefab-missing">Missing Prefab · {root.prefab.prefabAssetId}</p>
      ) : (
        <p className="panel-hint">{pathLabel}</p>
      )}
      <div className="inspector-prefab-actions">
        <button
          type="button"
          disabled={missing}
          onClick={() => {
            void editor.openPrefab(root.prefab!.prefabAssetId).catch(() => undefined);
          }}
        >
          Open Prefab
        </button>
        <button
          type="button"
          disabled={!asset}
          onClick={() => {
            setSelectedAssetId(root.prefab!.prefabAssetId);
          }}
        >
          Select Asset
        </button>
      </div>
      {isPrefabInstanceRoot(node) ? (
        <>
          <p className="panel-hint">Overrides: {String(overrides.length)}</p>
          <div className="inspector-prefab-actions">
            <button
              type="button"
              disabled={overrides.length === 0 || missing}
              onClick={() => editor.revertPrefabOverrides(root.id)}
            >
              Revert All
            </button>
            <button
              type="button"
              disabled={overrides.length === 0 || missing}
              onClick={() => {
                void editor.applyPrefabOverrides(root.id);
              }}
            >
              Apply All
            </button>
            <button type="button" onClick={() => editor.unpackPrefab(root.id)}>
              Unpack
            </button>
          </div>
          {overrides.length > 0 ? (
            <ul className="prefab-override-list">
              {overrides.map((override, index) => (
                <li key={overrideKey(override, index)}>
                  <span>{overrideLabel(override)}</span>
                  <button
                    type="button"
                    disabled={missing}
                    onClick={() => editor.revertPrefabOverrides(root.id, index)}
                  >
                    Revert
                  </button>
                  <button
                    type="button"
                    disabled={missing}
                    onClick={() => {
                      void editor.applyPrefabOverrides(root.id, index);
                    }}
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function prefabPathLabel(root: SceneNodeData, node: SceneNodeData): string {
  const name = root.name;
  if (node.id === root.id) {
    return name;
  }
  return `${name} / ${node.name}`;
}

function overrideLabel(override: PrefabOverride): string {
  if (override.kind === "name") {
    return "Name";
  }
  if (override.kind === "layer") {
    return "Layer";
  }
  if (override.kind === "visible") {
    return "Visible";
  }
  if (override.kind === "alpha") {
    return "Alpha";
  }
  return override.propertyPath;
}

function overrideKey(override: PrefabOverride, index: number): string {
  if (override.kind === "property") {
    return `${override.sourceNodeId}:${override.componentId}:${override.propertyPath}`;
  }
  return `${override.kind}:${override.sourceNodeId}:${String(index)}`;
}
