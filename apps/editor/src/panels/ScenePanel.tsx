import { useEffect, useRef, useState } from "react";
import {
  assetIdsFromDragPayload,
  decodeAssetDragPayload,
  dropAssetOntoScene,
  EDITOR_ASSET_MIME,
  MULTI_ASSET_SCENE_DROP_OFFSET,
  type TilemapEditTool,
} from "@game-editor/editor-core";
import {
  clampSnapGridSize,
  MAX_SNAP_GRID_SIZE,
  MAX_VIEWPORT_SCALE,
  MIN_SNAP_GRID_SIZE,
  MIN_VIEWPORT_SCALE,
  snapPositionToGrid,
  VIEWPORT_SCALE_STEP,
} from "@game-editor/renderer-pixi";
import {
  DEFAULT_NODE_SPAWN_POSITION,
  findNodeById,
  getSceneRendererKind,
  getTilemap,
} from "@game-editor/scene";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import {
  createLocalStorageEditorSettings,
  EDITOR_SCENE_VIEW_VERSION,
  type EditorSettingsStorage,
  type PersistedSceneViewSettings,
} from "../settings/editor-settings-storage";
import type {
  ThreeTransformMode,
  ThreeViewMode,
} from "../viewport/create-scene-viewport";
import { useSceneViewport } from "../viewport/use-scene-viewport";
import {
  SceneContextMenu,
  useSceneNodeContextMenu,
} from "./SceneContextMenu";

function formatScalePercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function ScenePanel({
  settings = createLocalStorageEditorSettings(),
}: {
  settings?: EditorSettingsStorage;
}) {
  const editor = useEditor();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedIds = useEditorState((ed) => ed.selection.getSelectedNodeIds());
  const assetRevision = useEditorState(
    (ed) => ed.assets.getRevision() ?? "",
  );
  const sceneRendererKind = useEditorState((ed) =>
    getSceneRendererKind(ed.getScene()),
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
  const [threeTransformMode, setThreeTransformMode] =
    useState<ThreeTransformMode>("translate");
  const [threeViewMode, setThreeViewMode] =
    useState<ThreeViewMode>("camera");
  const [showPixiLayers, setShowPixiLayers] = useState(true);
  const [showThreeLayers, setShowThreeLayers] = useState(true);
  const tilemapTool = useEditorState((ed) => ed.tilemapEdit.getTool());
  const tilemapSelected = useEditorState((ed) => {
    const id = ed.selection.getSelectedNodeIds().at(-1);
    if (!id) {
      return false;
    }
    const node = findNodeById(ed.getScene(), id);
    return Boolean(node && getTilemap(node));
  });

  const viewportRef = useSceneViewport({
    editor,
    hostRef,
    snapToGrid,
    snapGridSize,
    threeTransformMode,
    threeViewMode,
    showPixiLayers,
    showThreeLayers,
    selectedIds,
    onScale: setScale,
    onGuides: (landscape, portrait) => {
      setShowLandscape(landscape);
      setShowPortrait(portrait);
    },
  });
  const { menu: contextMenu, onViewportContextMenu, onAction: runSceneMenu } =
    useSceneNodeContextMenu(editor, viewportRef, selectedIds);

  useEffect(() => {
    setSnapGridSizeDraft(String(snapGridSize));
  }, [snapGridSize]);

  useEffect(() => {
    viewportRef.current?.setAssetResolver(editor.assets);
  }, [editor, assetRevision]);

  useEffect(() => {
    return editor.assets.subscribe(() => {
      viewportRef.current?.setAssetResolver(editor.assets);
    });
  }, [editor]);

  useEffect(() => {
    if (sceneRendererKind === "pixi") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.code === "KeyW") {
        event.preventDefault();
        setThreeTransformMode("translate");
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        setThreeTransformMode("rotate");
        return;
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        setThreeTransformMode("scale");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sceneRendererKind]);

  const nudgeScale = (direction: 1 | -1) => {
    const pixi = viewportRef.current?.pixi;
    if (!pixi) {
      return;
    }
    const next =
      pixi.getViewportCamera().scale * (1 + direction * VIEWPORT_SCALE_STEP);
    pixi.setViewportScale(next);
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
    viewportRef.current?.pixi?.setSnapToGrid(
      saved.snapToGrid,
      saved.snapGridSize,
    );
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

  const isPixi = sceneRendererKind === "pixi";
  const isThree = sceneRendererKind === "three";
  const isHybrid = sceneRendererKind === "hybrid";
  const showPixiChrome = isPixi || isHybrid;
  const showThreeTools = isThree || isHybrid;

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
        const viewport = viewportRef.current;
        const world = viewport
          ? viewport.clientToWorld(event.clientX, event.clientY)
          : { ...DEFAULT_NODE_SPAWN_POSITION };
        const position =
          showPixiChrome && snapToGrid
            ? snapPositionToGrid(world, snapGridSize)
            : world;
        const assetIds = assetIdsFromDragPayload(payload);
        for (const [index, assetId] of assetIds.entries()) {
          const offset = index * MULTI_ASSET_SCENE_DROP_OFFSET;
          const placed = {
            x: position.x + offset,
            y: position.y + offset,
          };
          if (editor.assets.get(assetId)?.type === "prefab") {
            void editor
              .instantiatePrefabFromAsset(assetId, placed)
              .catch((error: unknown) => {
                editor.console.log({
                  level: "error",
                  category: "prefab",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Instantiate prefab failed",
                });
              });
            continue;
          }
          dropAssetOntoScene(editor, assetId, placed);
        }
      }}
    >
      <div className="scene-toolbar" role="toolbar" aria-label="Scene preview">
        <div className="scene-toolbar-group">
          <span className="scene-toolbar-label mono">
            {isHybrid ? "Hybrid" : isThree ? "Three.js" : "PixiJS"}
          </span>
        </div>
        {showPixiChrome && tilemapSelected ? (
          <div className="scene-toolbar-group">
            <span className="scene-toolbar-label">Tiles</span>
            {(
              [
                ["paint", "Paint"],
                ["erase", "Erase"],
                ["picker", "Picker"],
              ] as const satisfies ReadonlyArray<readonly [TilemapEditTool, string]>
            ).map(([tool, label]) => (
              <button
                key={tool}
                type="button"
                className={
                  tilemapTool === tool
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={tilemapTool === tool}
                title={label}
                onClick={() => editor.tilemapEdit.setTool(tool)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {showThreeTools ? (
          <>
            <div className="scene-toolbar-group">
              <span className="scene-toolbar-label">View</span>
              <button
                type="button"
                className={
                  threeViewMode === "camera"
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={threeViewMode === "camera"}
                title="Match Preview (active scene camera)"
                onClick={() => setThreeViewMode("camera")}
              >
                Camera
              </button>
              <button
                type="button"
                className={
                  threeViewMode === "editor"
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={threeViewMode === "editor"}
                title="Free orbit for editing lights and helpers"
                onClick={() => setThreeViewMode("editor")}
              >
                Orbit
              </button>
            </div>
            <div className="scene-toolbar-group">
              <span className="scene-toolbar-label">Gizmo</span>
              <button
                type="button"
                className={
                  threeTransformMode === "translate"
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={threeTransformMode === "translate"}
                title="Move (W)"
                onClick={() => setThreeTransformMode("translate")}
              >
                Move
              </button>
              <button
                type="button"
                className={
                  threeTransformMode === "rotate"
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={threeTransformMode === "rotate"}
                title="Rotate (E)"
                onClick={() => setThreeTransformMode("rotate")}
              >
                Rotate
              </button>
              <button
                type="button"
                className={
                  threeTransformMode === "scale"
                    ? "scene-toolbar-toggle active"
                    : "scene-toolbar-toggle"
                }
                aria-pressed={threeTransformMode === "scale"}
                title="Scale (R)"
                onClick={() => setThreeTransformMode("scale")}
              >
                Scale
              </button>
            </div>
          </>
        ) : null}
        {isHybrid ? (
          <div className="scene-toolbar-group">
            <span className="scene-toolbar-label">Layers</span>
            <label
              className="scene-toolbar-checkbox"
              title="Show Pixi (2D) background and foreground"
            >
              <input
                type="checkbox"
                checked={showPixiLayers}
                onChange={(event) => setShowPixiLayers(event.target.checked)}
              />
              <span>Pixi</span>
            </label>
            <label
              className="scene-toolbar-checkbox"
              title="Show 3D layer"
            >
              <input
                type="checkbox"
                checked={showThreeLayers}
                onChange={(event) => setShowThreeLayers(event.target.checked)}
              />
              <span>3D</span>
            </label>
          </div>
        ) : null}
        {showPixiChrome ? (
          <>
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
                  viewportRef.current?.pixi?.setScreenGuideOrientations({
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
                  viewportRef.current?.pixi?.setScreenGuideOrientations({
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
                  viewportRef.current?.pixi?.setViewportScale(next);
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
              <span className="scene-scale-value mono">
                {formatScalePercent(scale)}
              </span>
              <button
                type="button"
                className="scene-toolbar-btn"
                title="Reset pan and scale"
                onClick={() => {
                  viewportRef.current?.pixi?.resetViewportCamera();
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
              {isHybrid
                ? " · Select 2D node for Pixi gizmos · W/E/R for 3D gizmo"
                : ""}
            </span>
          </>
        ) : (
          <span className="scene-toolbar-hint">
            Left-drag orbit · Gizmo on selection · W/E/R move/rotate/scale ·
            Wheel zoom · Drop GLB for Model3D
          </span>
        )}
      </div>
      <div
        ref={hostRef}
        className="scene-viewport"
        onContextMenu={onViewportContextMenu}
      />
      {contextMenu ? (
        <SceneContextMenu menu={contextMenu} onAction={runSceneMenu} />
      ) : null}
      {dropActive ? (
        <div className="scene-drop-overlay">
          {isThree
            ? "Drop GLB to create Model3D"
            : "Drop asset to create Sprite / Model3D"}
        </div>
      ) : null}
    </div>
  );
}
