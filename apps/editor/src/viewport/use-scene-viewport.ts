import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor } from "@game-editor/editor-core";
import {
  findNodeById,
  getNodeLayer,
  getSceneRendererKind,
  getTransform2D,
} from "@game-editor/scene";
import {
  createSceneViewport,
  type SceneViewportHandle,
  type ThreeTransformMode,
  type ThreeViewMode,
} from "./create-scene-viewport";
import { bindPixiTransformTool } from "./pixi-transform-tool";
import { bindThreeTransformTool } from "./three-transform-tool";

/**
 * Owns scene viewport mount/remount, tool binding, and hybrid input routing.
 */
export function useSceneViewport(args: {
  editor: Editor;
  hostRef: RefObject<HTMLDivElement | null>;
  snapToGrid: boolean;
  snapGridSize: number;
  threeTransformMode: ThreeTransformMode;
  threeViewMode: ThreeViewMode;
  selectedIds: readonly string[];
  onScale: (scale: number) => void;
  onGuides: (landscape: boolean, portrait: boolean) => void;
}): RefObject<SceneViewportHandle | null> {
  const {
    editor,
    hostRef,
    snapToGrid,
    snapGridSize,
    threeTransformMode,
    threeViewMode,
    selectedIds,
    onScale,
    onGuides,
  } = args;
  const viewportRef = useRef<SceneViewportHandle | null>(null);
  const [viewportGeneration, setViewportGeneration] = useState(0);
  const snapToGridRef = useRef(snapToGrid);
  const snapGridSizeRef = useRef(snapGridSize);
  snapToGridRef.current = snapToGrid;
  snapGridSizeRef.current = snapGridSize;

  useEffect(() => {
    return editor.subscribeViewportRemount(() => {
      setViewportGeneration((generation) => generation + 1);
    });
  }, [editor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let unbindTool: (() => void) | undefined;
    let unbindCamera: (() => void) | undefined;
    let viewport: SceneViewportHandle | undefined;
    const kind = getSceneRendererKind(editor.getScene());

    void createSceneViewport({
      host,
      kind,
      assetResolver: editor.assets,
    }).then((created) => {
      if (cancelled) {
        void created.destroy();
        return;
      }
      viewport = created;
      viewportRef.current = created;

      const unbinds: Array<() => void> = [];
      if (
        created.kind === "hybrid" &&
        created.pixiBackground &&
        created.pixiForeground
      ) {
        unbinds.push(bindPixiTransformTool(editor, created.pixiBackground));
        unbinds.push(bindPixiTransformTool(editor, created.pixiForeground));
      } else if (created.pixi) {
        unbinds.push(bindPixiTransformTool(editor, created.pixi));
      }
      if (created.pixi) {
        unbindCamera = created.pixi.subscribeViewportCamera((state) => {
          onScale(state.scale);
        });
        onScale(created.pixi.getViewportCamera().scale);
        const orientations = created.pixi.getScreenGuideOrientations();
        onGuides(orientations.landscape, orientations.portrait);
        created.pixi.setSnapToGrid(
          snapToGridRef.current,
          snapGridSizeRef.current,
        );
        created.pixiForeground?.setSnapToGrid(
          snapToGridRef.current,
          snapGridSizeRef.current,
        );
      }
      if (created.three && created.kind !== "pixi") {
        unbinds.push(bindThreeTransformTool(editor, created.three));
        created.setThreeTransformMode?.(threeTransformMode);
        created.setThreeViewMode?.(threeViewMode);
      }
      unbindTool = () => {
        for (const unbind of unbinds) {
          unbind();
        }
      };

      editor.attachRenderer(created.documentRenderer);
      created.setSelectedNodeIds(editor.selection.getSelectedNodeIds());
    });

    return () => {
      cancelled = true;
      unbindCamera?.();
      unbindTool?.();
      editor.detachRenderer();
      viewportRef.current = null;
      void viewport?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount via generation
  }, [editor, viewportGeneration]);

  useEffect(() => {
    viewportRef.current?.pixi?.setSnapToGrid(snapToGrid, snapGridSize);
    viewportRef.current?.pixiForeground?.setSnapToGrid(snapToGrid, snapGridSize);
  }, [snapToGrid, snapGridSize]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    vp.setSelectedNodeIds(selectedIds);
    if (!vp.setHybridInputLayer) {
      return;
    }
    const primaryId = selectedIds[selectedIds.length - 1];
    if (!primaryId) {
      vp.setHybridInputLayer("three");
      return;
    }
    const node = findNodeById(editor.getScene(), primaryId);
    if (node && getTransform2D(node)) {
      vp.setHybridInputLayer(
        getNodeLayer(node) === "foreground" ? "foreground" : "background",
      );
      return;
    }
    vp.setHybridInputLayer("three");
  }, [selectedIds, editor]);

  useEffect(() => {
    viewportRef.current?.setThreeTransformMode?.(threeTransformMode);
  }, [threeTransformMode]);

  useEffect(() => {
    viewportRef.current?.setThreeViewMode?.(threeViewMode);
  }, [threeViewMode]);

  return viewportRef;
}
