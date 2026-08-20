import {
  findNodeById,
  getAmbientLight,
  getDirectionalLight,
  getModel3D,
  getPerspectiveCamera,
  getSprite,
  getTransform2D,
  getTransform3D,
  getVisualAnchorOrDefault,
  getVisualComponent,
  visualComponentSupportsAnchor,
} from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { VisualComponentInspector } from "./VisualComponentInspector";
import { Model3DInspector } from "./Model3DInspector";
import { PerspectiveCameraInspector } from "./PerspectiveCameraInspector";
import {
  AmbientLightInspector,
  DirectionalLightInspector,
} from "./ThreeLightInspector";
import { ScriptComponentsInspector } from "./ScriptComponentsInspector";
import { HitZoneInspector } from "./HitZoneInspector";
import { MaskInspector } from "./MaskInspector";
import { NodePointerInspector } from "./NodePointerInspector";
import { PrefabInspectorSection } from "./PrefabInspectorSection";
import { getInspectorEffectiveTransform2D } from "./inspector-node-state";
import { InspectorLockedBanner } from "./InspectorLockedBanner";
import { NodeInspectorSection } from "./NodeInspectorSection";
import { SceneInspector } from "./SceneInspector";
import { SpriteSizeInspector } from "./SpriteSizeInspector";
import { Transform2DInspector } from "./Transform2DInspector";
import { Transform3DInspector } from "./Transform3DInspector";
import { useInspectorTransformDrafts } from "./useInspectorTransformDrafts";

export function InspectorPanel() {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const sceneSelected = useEditorState((ed) => ed.selection.isSceneSelected());
  const selectedId = useEditorState((ed) => ed.selection.getPrimaryNodeId());
  const activeStateId = useEditorState((ed) =>
    ed.nodeStates.getActiveStateId(),
  );
  const node =
    !sceneSelected && selectedId
      ? findNodeById(scene, selectedId)
      : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  const effectiveTransform2D = node
    ? getInspectorEffectiveTransform2D(node, activeStateId)
    : undefined;
  const transform3D = node ? getTransform3D(node) : undefined;
  const model3D = node ? getModel3D(node) : undefined;
  const perspectiveCamera = node ? getPerspectiveCamera(node) : undefined;
  const directionalLight = node ? getDirectionalLight(node) : undefined;
  const ambientLight = node ? getAmbientLight(node) : undefined;
  const sprite = node ? getSprite(node) : undefined;
  const visual = node ? getVisualComponent(node) : undefined;
  const supportsAnchor = visual
    ? visualComponentSupportsAnchor(visual)
    : false;
  const visualAnchor = visual ? getVisualAnchorOrDefault(visual) : undefined;
  const inspectorIdentity = `${selectedId ?? ""}:${activeStateId}`;
  const {
    draft,
    setDraft,
    draft3D,
    setDraft3D,
    sizeDraft,
    setSizeDraft,
    commitTransform,
    commitAnchor,
    commitTransform3D,
    commitSize,
  } = useInspectorTransformDrafts({
    editor,
    inspectorIdentity,
    node,
    transform,
    effectiveTransform2D,
    transform3D,
    sprite,
    visual,
    visualAnchor,
    supportsAnchor,
  });

  if (sceneSelected) {
    return <SceneInspector />;
  }

  if (!node) {
    return (
      <div className="panel panel-inspector">
        <p className="panel-hint">Inspector</p>
        <p className="panel-empty">Select a node</p>
      </div>
    );
  }

  const editorFlags = editor.getEditorNodeFlags(node.id);
  const inspectorLocked = editorFlags.effectivelyLocked;

  return (
    <div className="panel panel-inspector">
      <p className="panel-hint">Inspector · {node.name}</p>
      <InspectorLockedBanner editor={editor} node={node} flags={editorFlags} />
      <fieldset className="inspector-edit-fieldset" disabled={inspectorLocked}>
        <PrefabInspectorSection node={node} />
        <NodeInspectorSection
          editor={editor}
          node={node}
          activeStateId={activeStateId}
        />
        <NodePointerInspector editor={editor} node={node} />
        {transform ? (
          <Transform2DInspector
            editor={editor}
            scene={scene}
            node={node}
            activeStateId={activeStateId}
            transform={transform}
            effectiveTransform2D={effectiveTransform2D}
            draft={draft}
            setDraft={setDraft}
            supportsAnchor={supportsAnchor}
            commitTransform={commitTransform}
            commitAnchor={commitAnchor}
          />
        ) : null}
        {transform3D && draft3D ? (
          <Transform3DInspector
            draft={draft3D}
            setDraft={setDraft3D}
            commit={commitTransform3D}
          />
        ) : null}
        {model3D ? <Model3DInspector editor={editor} node={node} /> : null}
        {perspectiveCamera ? (
          <PerspectiveCameraInspector editor={editor} node={node} />
        ) : null}
        {directionalLight ? (
          <DirectionalLightInspector editor={editor} node={node} />
        ) : null}
        {ambientLight ? (
          <AmbientLightInspector editor={editor} node={node} />
        ) : null}
        {sprite && sizeDraft ? (
          <SpriteSizeInspector
            editor={editor}
            sprite={sprite}
            sizeDraft={sizeDraft}
            setSizeDraft={setSizeDraft}
            commitSize={commitSize}
          />
        ) : (
          <VisualComponentInspector editor={editor} node={node} />
        )}
        <HitZoneInspector editor={editor} scene={scene} node={node} />
        <MaskInspector editor={editor} scene={scene} node={node} />
        <ScriptComponentsInspector node={node} />
      </fieldset>
    </div>
  );
}
