import type { Editor } from "@game-editor/editor-core";
import {
  getVisualComponent,
  type SceneNodeData,
  type VisualComponentData,
} from "@game-editor/scene";
import { GraphicsFields } from "./visual-fields/graphics";
import {
  MeshFields,
  MeshPlaneFields,
  MeshRopeFields,
  MeshSimpleFields,
  PerspectiveMeshFields,
} from "./visual-fields/mesh";
import {
  AnimatedSpriteFields,
  NineSliceFields,
  SpriteFields,
  TilingFields,
} from "./visual-fields/sprites";
import { SpineFields } from "./visual-fields/spine";
import { BitmapTextFields, TextStyleFields } from "./visual-fields/text";
import type { VisualCommit } from "./visual-fields/types";

interface Props {
  editor: Editor;
  node: SceneNodeData;
}

/** Type-driven visual component inspector (shared field widgets, per-type sections). */
export function VisualComponentInspector({ editor, node }: Props) {
  const visual = getVisualComponent(node);
  if (!visual) {
    return null;
  }

  return (
    <section className="inspector-section">
      <h3>{visual.type}</h3>
      <div className="inspector-grid">
        <VisualFields editor={editor} nodeId={node.id} visual={visual} />
      </div>
    </section>
  );
}

function VisualFields({
  editor,
  nodeId,
  visual,
}: {
  editor: Editor;
  nodeId: string;
  visual: VisualComponentData;
}) {
  const commit: VisualCommit = (patch) => {
    editor.setVisualComponent(nodeId, patch);
  };

  switch (visual.type) {
    case "Sprite":
      return <SpriteFields visual={visual} commit={commit} editor={editor} />;
    case "NineSliceSprite":
      return <NineSliceFields visual={visual} commit={commit} />;
    case "TilingSprite":
      return <TilingFields visual={visual} commit={commit} />;
    case "Graphics":
      return <GraphicsFields visual={visual} commit={commit} />;
    case "Text":
    case "HTMLText":
      return <TextStyleFields visual={visual} commit={commit} />;
    case "BitmapText":
      return <BitmapTextFields visual={visual} commit={commit} />;
    case "MeshSimple":
      return <MeshSimpleFields visual={visual} commit={commit} />;
    case "MeshRope":
      return <MeshRopeFields visual={visual} commit={commit} />;
    case "MeshPlane":
      return <MeshPlaneFields visual={visual} commit={commit} />;
    case "PerspectiveMesh":
      return <PerspectiveMeshFields visual={visual} commit={commit} />;
    case "Mesh":
      return <MeshFields visual={visual} commit={commit} />;
    case "AnimatedSprite":
      return <AnimatedSpriteFields visual={visual} commit={commit} editor={editor} />;
    case "Spine":
      return <SpineFields visual={visual} commit={commit} editor={editor} />;
    default: {
      const _exhaustive: never = visual;
      return _exhaustive;
    }
  }
}
