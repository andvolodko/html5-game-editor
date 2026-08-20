import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Editor } from "@game-editor/editor-core";
import type { SceneNodeData } from "@game-editor/scene";
import {
  commitBoundAnchor,
  commitBoundSpriteSize,
  commitBoundTransform2D,
  commitBoundTransform3D,
  createSpriteSizeDraft,
  createTransform2DDraft,
  createTransform3DDraft,
  type SizeCommitTarget,
  type SpriteSizeDraft,
  type Transform2DCommitTarget,
  type Transform3DCommitTarget,
  type Transform3DDraft,
  type TransformDraft,
} from "./inspector-transform-commit";

interface InspectorTransformDraftsArgs {
  editor: Editor;
  inspectorIdentity: string;
  node: SceneNodeData | undefined;
  transform: Transform2DCommitTarget["transform"] | undefined;
  effectiveTransform2D: Transform2DCommitTarget["effectiveTransform2D"] | undefined;
  transform3D: Transform3DCommitTarget["transform3D"] | undefined;
  sprite: Transform2DCommitTarget["sprite"];
  visual: Transform2DCommitTarget["visual"];
  visualAnchor: { x: number; y: number } | undefined;
  supportsAnchor: boolean;
}

export function useInspectorTransformDrafts({
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
}: InspectorTransformDraftsArgs): {
  draft: TransformDraft | null;
  setDraft: Dispatch<SetStateAction<TransformDraft | null>>;
  draft3D: Transform3DDraft | null;
  setDraft3D: Dispatch<SetStateAction<Transform3DDraft | null>>;
  sizeDraft: SpriteSizeDraft | null;
  setSizeDraft: Dispatch<SetStateAction<SpriteSizeDraft | null>>;
  commitTransform: () => void;
  commitAnchor: () => void;
  commitTransform3D: () => void;
  commitSize: () => void;
} {
  const [draft, setDraft] = useState<TransformDraft | null>(null);
  const [draft3D, setDraft3D] = useState<Transform3DDraft | null>(null);
  const [sizeDraft, setSizeDraft] = useState<SpriteSizeDraft | null>(null);
  const inspectorIdentityRef = useRef(inspectorIdentity);
  const ignoreStaleInspectorBlurRef = useRef(false);
  const draftRef = useRef(draft);
  const draft3DRef = useRef(draft3D);
  const sizeDraftRef = useRef(sizeDraft);
  draftRef.current = draft;
  draft3DRef.current = draft3D;
  sizeDraftRef.current = sizeDraft;
  const transformCommitRef = useRef<Transform2DCommitTarget | null>(null);
  const transform3DCommitRef = useRef<Transform3DCommitTarget | null>(null);
  const sizeCommitRef = useRef<SizeCommitTarget | null>(null);

  useLayoutEffect(() => {
    if (inspectorIdentityRef.current !== inspectorIdentity) {
      const transformTarget = transformCommitRef.current;
      const transformDraft = draftRef.current;
      if (transformTarget && transformDraft) {
        commitBoundTransform2D(editor, transformTarget, transformDraft);
        commitBoundAnchor(editor, transformTarget, transformDraft);
      }
      const transform3DTarget = transform3DCommitRef.current;
      const transform3DDraft = draft3DRef.current;
      if (transform3DTarget && transform3DDraft) {
        commitBoundTransform3D(editor, transform3DTarget, transform3DDraft);
      }
      const sizeTarget = sizeCommitRef.current;
      const spriteSizeDraft = sizeDraftRef.current;
      if (sizeTarget && spriteSizeDraft) {
        commitBoundSpriteSize(editor, sizeTarget, spriteSizeDraft);
      }
      ignoreStaleInspectorBlurRef.current = true;
      inspectorIdentityRef.current = inspectorIdentity;
    }

    if (!node || !transform || !effectiveTransform2D) {
      transformCommitRef.current = null;
      setDraft(null);
    } else {
      transformCommitRef.current = {
        nodeId: node.id,
        transform,
        effectiveTransform2D,
        visual,
        sprite,
        supportsAnchor,
      };
      setDraft(
        createTransform2DDraft(transform, effectiveTransform2D, visualAnchor),
      );
    }

    if (!node || !transform3D) {
      transform3DCommitRef.current = null;
      setDraft3D(null);
    } else {
      transform3DCommitRef.current = { nodeId: node.id, transform3D };
      setDraft3D(createTransform3DDraft(transform3D));
    }

    if (!node || !sprite) {
      sizeCommitRef.current = null;
      setSizeDraft(null);
    } else {
      sizeCommitRef.current = { nodeId: node.id, sprite };
      setSizeDraft(createSpriteSizeDraft(sprite));
    }
  }, [
    inspectorIdentity,
    supportsAnchor,
    effectiveTransform2D?.position.x,
    effectiveTransform2D?.position.y,
    effectiveTransform2D?.rotation,
    effectiveTransform2D?.scale.x,
    effectiveTransform2D?.scale.y,
    transform?.skew?.x,
    transform?.skew?.y,
    visualAnchor?.x,
    visualAnchor?.y,
    sprite?.width,
    sprite?.height,
    transform3D?.position.x,
    transform3D?.position.y,
    transform3D?.position.z,
    transform3D?.rotation.x,
    transform3D?.rotation.y,
    transform3D?.rotation.z,
    transform3D?.scale.x,
    transform3D?.scale.y,
    transform3D?.scale.z,
  ]);

  useEffect(() => {
    ignoreStaleInspectorBlurRef.current = false;
  });

  const commitIfCurrent = (run: () => void) => {
    if (ignoreStaleInspectorBlurRef.current) {
      return;
    }
    run();
  };

  return {
    draft,
    setDraft,
    draft3D,
    setDraft3D,
    sizeDraft,
    setSizeDraft,
    commitTransform: () =>
      commitIfCurrent(() => {
        const target = transformCommitRef.current;
        const currentDraft = draftRef.current;
        if (!target || !currentDraft) {
          return;
        }
        commitBoundTransform2D(editor, target, currentDraft);
      }),
    commitAnchor: () =>
      commitIfCurrent(() => {
        const target = transformCommitRef.current;
        const currentDraft = draftRef.current;
        if (!target || !currentDraft) {
          return;
        }
        commitBoundAnchor(editor, target, currentDraft);
      }),
    commitTransform3D: () =>
      commitIfCurrent(() => {
        const target = transform3DCommitRef.current;
        const currentDraft = draft3DRef.current;
        if (!target || !currentDraft) {
          return;
        }
        commitBoundTransform3D(editor, target, currentDraft);
      }),
    commitSize: () =>
      commitIfCurrent(() => {
        const target = sizeCommitRef.current;
        const currentDraft = sizeDraftRef.current;
        if (!target || !currentDraft) {
          return;
        }
        commitBoundSpriteSize(editor, target, currentDraft);
      }),
  };
}
