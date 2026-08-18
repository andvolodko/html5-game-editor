import { useEffect, useMemo, useState } from "react";
import {
  findScript,
  getModel3D,
  getScriptComponents,
  isScriptEnabled,
  type SceneNodeData,
} from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { AddComponentMenu } from "./AddComponentMenu";
import { ScriptComponentSection } from "./ScriptComponentSection";
import { isInspectorPropertyOverridden } from "./prefab-override-flag";

interface ScriptComponentsInspectorProps {
  node: SceneNodeData;
}

export function ScriptComponentsInspector({
  node,
}: ScriptComponentsInspectorProps) {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const catalogRevision = useEditorState((ed) => ed.getStoreVersion());
  const scripts = getScriptComponents(node);
  const [sceneIds, setSceneIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void editor
      .listScenes()
      .then((scenes) => {
        if (!cancelled) {
          setSceneIds(scenes.map((scene) => scene.id).sort((a, b) => a.localeCompare(b)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSceneIds([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editor, catalogRevision]);

  const busEvents = useMemo(() => {
    void catalogRevision;
    return editor.getBusEvents();
  }, [editor, catalogRevision]);

  const gltfAnimations = useMemo(() => {
    void catalogRevision;
    const model = getModel3D(node);
    const asset = model?.assetId ? editor.assets.get(model.assetId) : undefined;
    if (asset?.metadata.kind !== "gltf") {
      return [];
    }
    return asset.metadata.animations;
  }, [editor, node, catalogRevision]);

  const dynamicOptions = useMemo(
    () => ({ scenes: sceneIds, busEvents, gltfAnimations }),
    [sceneIds, busEvents, gltfAnimations],
  );

  const addableGroups = useMemo(() => {
    void catalogRevision;
    const attached = new Set(scripts.map((s) => s.scriptId));
    return editor.components
      .listMenuGroups()
      .map((group) => ({
        ...group,
        definitions: group.definitions.filter((def) => {
          if (def.allowMultiple === true) {
            return true;
          }
          return !attached.has(def.id);
        }),
      }))
      .filter((group) => group.definitions.length > 0);
  }, [editor, scripts, catalogRevision]);

  return (
    <>
      {scripts.map((component) => (
        <ScriptComponentSection
          key={component.id}
          component={component}
          definition={editor.components.get(component.scriptId)}
          dynamicOptions={dynamicOptions}
          enabled={isScriptEnabled(component)}
          enabledOverridden={isInspectorPropertyOverridden(
            scene,
            node,
            component.id,
            "enabled",
          )}
          onEnabledCommit={(enabled) => {
            editor.setScriptEnabled(node.id, component.id, enabled);
          }}
          onPropertyCommit={(key, value) => {
            editor.setScriptProperties(node.id, component.id, {
              [key]: value,
            });
          }}
          onRemove={() => editor.removeComponent(node.id, component.id)}
        />
      ))}
      <AddComponentMenu
        groups={addableGroups}
        onAdd={(scriptId) => {
          const def = editor.components.get(scriptId);
          if (
            def &&
            def.allowMultiple !== true &&
            findScript(node, scriptId)
          ) {
            return;
          }
          editor.addScriptComponent(node.id, scriptId);
        }}
      />
    </>
  );
}
