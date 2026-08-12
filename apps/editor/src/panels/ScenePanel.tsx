import { useEffect, useRef, useState } from "react";
import {
  decodeAssetDragPayload,
  dropAssetOntoScene,
  EDITOR_ASSET_MIME,
} from "@game-editor/editor-core";
import {
  clampSnapGridSize,
  MAX_SNAP_GRID_SIZE,
  MAX_VIEWPORT_SCALE,
  MIN_SNAP_GRID_SIZE,
  MIN_VIEWPORT_SCALE,
  PixiSceneRenderer,
  snapPositionToGrid,
  VIEWPORT_SCALE_STEP,
} from "@game-editor/renderer-pixi";
import { DEFAULT_NODE_SPAWN_POSITION } from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import {
  createLocalStorageEditorSettings,
  EDITOR_SCENE_VIEW_VERSION,
  type EditorSettingsStorage,
  type PersistedSceneViewSettings,
} from "../settings/editor-settings-storage";
import { bindPixiTransformTool } from "../viewport/pixi-transform-tool";

function formatScalePercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

export function ScenePanel({
  settings = createLocalStorageEditorSettings(),
}: {
  settings?: EditorSettingsStorage;
}) {
  const editor = useEditor();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSceneRenderer | null>(null);
  const selectedIds = useEditorState((ed) => ed.selection.getSelectedNodeIds());
  const assetRevision = useEditorState(
    (ed) => ed.assets.getRevision() ?? "",
  );
  const [dropActive, setDropActive] = useState(false);
  const [scale, setScale] = useState(1);
  const [showLandscape, setShowLandscape] = useState(true);
  const [showPortrait, setShowPortrait] = useState(true);
  const initialSceneView = useRef(settings.loadSceneView()).current;
  const [snapToGrid, setSnapToGrid] = useState(initialSceneView.snapToGrid);
  const [snapGridSize, setSnapGridSize] = useState(initialSceneView.snapGridSize);
  const [snapGridSizeDraft, setSnapGridSizeDraft] = useState(
    String(initialSceneView.snapGridSize),
  );
  const snapToGridRef = useRef(snapToGrid);
  const snapGridSizeRef = useRef(snapGridSize);
  snapToGridRef.current = snapToGrid;
  snapGridSizeRef.current = snapGridSize;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      assetResolver: editor.assets,
      pixelGrid: true,
      screenGuides: true,
    });
    rendererRef.current = renderer;
    let cancelled = false;
    let unbindTool: (() => void) | undefined;
    let unbindCamera: (() => void) | undefined;

    void renderer.whenReady().then(() => {
      if (cancelled) {
        return;
      }
      unbindTool = bindPixiTransformTool(editor, renderer);
      unbindCamera = renderer.subscribeViewportCamera((state) => {
        setScale(state.scale);
      });
      setScale(renderer.getViewportCamera().scale);
      const orientations = renderer.getScreenGuideOrientations();
      setShowLandscape(orientations.landscape);
      setShowPortrait(orientations.portrait);
      renderer.setSnapToGrid(snapToGridRef.current, snapGridSizeRef.current);
      editor.attachRenderer(renderer);
      renderer.setSelectedNodeIds(editor.selection.getSelectedNodeIds());
    });

    return () => {
      cancelled = true;
      unbindCamera?.();
      unbindTool?.();
      editor.detachRenderer();
      rendererRef.current = null;
      void renderer.destroy();
    };
  }, [editor]);

  useEffect(() => {
    rendererRef.current?.setSnapToGrid(snapToGrid, snapGridSize);
  }, [snapToGrid, snapGridSize]);

  useEffect(() => {
    setSnapGridSizeDraft(String(snapGridSize));
  }, [snapGridSize]);

  useEffect(() => {
    rendererRef.current?.setSelectedNodeIds(selectedIds);
  }, [selectedIds]);

  // Re-bind resolver when the catalogue changes (import/delete/refresh).
  // Content URLs are stable by assetId, so path moves do not evict textures.
  useEffect(() => {
    rendererRef.current?.setAssetResolver(editor.assets);
  }, [editor, assetRevision]);

  // Direct subscription so a late refresh still repaints even if React batched
  // the revision read before the renderer ref existed.
  useEffect(() => {
    return editor.assets.subscribe(() => {
      rendererRef.current?.setAssetResolver(editor.assets);
    });
  }, [editor]);

  const nudgeScale = (direction: 1 | -1) => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    const next =
      renderer.getViewportCamera().scale * (1 + direction * VIEWPORT_SCALE_STEP);
    renderer.setViewportScale(next);
  };

  const persistSceneView = (next: PersistedSceneViewSettings) => {
    const snapGridSizeClamped = clampSnapGridSize(next.snapGridSize);
    const saved: PersistedSceneViewSettings = {
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: next.snapToGrid,
      snapGridSize: snapGridSizeClamped,
    };
    setSnapToGrid(saved.snapToGrid);
    setSnapGridSize(saved.snapGridSize);
    settings.saveSceneView(saved);
    rendererRef.current?.setSnapToGrid(saved.snapToGrid, saved.snapGridSize);
  };

  const commitSnapGridSizeDraft = () => {
    const parsed = Number.parseInt(snapGridSizeDraft, 10);
    const next = clampSnapGridSize(parsed);
    if (next === snapGridSize) {
      setSnapGridSizeDraft(String(snapGridSize));
      return;
    }
    persistSceneView({
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid,
      snapGridSize: next,
    });
  };

  return (
    <div
      className={
        dropActive ? "panel panel-scene scene-drop-active" : "panel panel-scene"
      }
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes(EDITOR_ASSET_MIME)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDropActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        const raw = event.dataTransfer.getData(EDITOR_ASSET_MIME);
        const payload = decodeAssetDragPayload(raw);
        if (!payload) {
          return;
        }
        const renderer = rendererRef.current;
        const world = renderer
          ? renderer.clientToWorld(event.clientX, event.clientY)
          : { ...DEFAULT_NODE_SPAWN_POSITION };
        const position = snapToGrid
          ? snapPositionToGrid(world, snapGridSize)
          : world;
        dropAssetOntoScene(editor, payload.assetId, position);
      }}
    >
      <div className="scene-toolbar" role="toolbar" aria-label="Scene preview">
        <div className="scene-toolbar-group">
          <span className="scene-toolbar-label">Guides</span>
          <button
            type="button"
            className={
              showLandscape
                ? "scene-toolbar-toggle active"
                : "scene-toolbar-toggle"
            }
            aria-pressed={showLandscape}
            title="Landscape screen outlines"
            onClick={() => {
              const next = !showLandscape;
              setShowLandscape(next);
              rendererRef.current?.setScreenGuideOrientations({
                landscape: next,
              });
            }}
          >
            LS
          </button>
          <button
            type="button"
            className={
              showPortrait
                ? "scene-toolbar-toggle active"
                : "scene-toolbar-toggle"
            }
            aria-pressed={showPortrait}
            title="Portrait screen outlines"
            onClick={() => {
              const next = !showPortrait;
              setShowPortrait(next);
              rendererRef.current?.setScreenGuideOrientations({
                portrait: next,
              });
            }}
          >
            PT
          </button>
        </div>
        <div className="scene-toolbar-group">
          <span className="scene-toolbar-label">Scale</span>
          <button
            type="button"
            className="scene-toolbar-btn"
            title="Zoom out"
            aria-label="Zoom out"
            disabled={scale <= MIN_VIEWPORT_SCALE + 1e-9}
            onClick={() => nudgeScale(-1)}
          >
            −
          </button>
          <input
            className="scene-scale-input"
            type="range"
            min={MIN_VIEWPORT_SCALE}
            max={MAX_VIEWPORT_SCALE}
            step={VIEWPORT_SCALE_STEP}
            value={scale}
            aria-label="Preview scale"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) {
                return;
              }
              rendererRef.current?.setViewportScale(next);
            }}
          />
          <button
            type="button"
            className="scene-toolbar-btn"
            title="Zoom in"
            aria-label="Zoom in"
            disabled={scale >= MAX_VIEWPORT_SCALE - 1e-9}
            onClick={() => nudgeScale(1)}
          >
            +
          </button>
          <span className="scene-scale-value mono">{formatScalePercent(scale)}</span>
          <button
            type="button"
            className="scene-toolbar-btn"
            title="Reset pan and scale"
            onClick={() => {
              rendererRef.current?.resetViewportCamera();
            }}
          >
            Reset
          </button>
        </div>
        <div className="scene-toolbar-group">
          <label
            className="scene-toolbar-checkbox"
            title={`Snap node moves and drops to a ${snapGridSize}px grid`}
          >
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(event) => {
                persistSceneView({
                  version: EDITOR_SCENE_VIEW_VERSION,
                  snapToGrid: event.target.checked,
                  snapGridSize,
                });
              }}
            />
            <span>Snap to grid</span>
          </label>
          <label
            className="scene-toolbar-grid-size"
            title="Snap grid size in world pixels"
          >
            <span className="scene-toolbar-label">Size</span>
            <input
              className="scene-grid-size-input mono"
              type="number"
              min={MIN_SNAP_GRID_SIZE}
              max={MAX_SNAP_GRID_SIZE}
              step={1}
              inputMode="numeric"
              aria-label="Snap grid size in pixels"
              disabled={!snapToGrid}
              value={snapGridSizeDraft}
              onChange={(event) => {
                setSnapGridSizeDraft(event.target.value);
              }}
              onBlur={commitSnapGridSizeDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitSnapGridSizeDraft();
                  (event.target as HTMLInputElement).blur();
                }
              }}
            />
            <span className="scene-grid-size-unit">px</span>
          </label>
        </div>
        <span className="scene-toolbar-hint">
          Middle-mouse drag to pan · Wheel to scale
        </span>
      </div>
      <div ref={hostRef} className="scene-viewport" />
      {dropActive ? (
        <div className="scene-drop-overlay">Drop asset to create Sprite</div>
      ) : null}
    </div>
  );
}
