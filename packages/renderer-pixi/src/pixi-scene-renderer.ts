import { Application, Rectangle, Texture } from "pixi.js";
import type { Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import {
  DEFAULT_SPRITE_SIZE,
  getSprite,
  getTransform2D,
  getVisualComponent,
  getVisualAnchorOrDefault,
  spriteGizmoHitOutsets,
  visualCenterFromAnchor,
  DEFAULT_VISUAL_ANCHOR,
  type SceneNodeData,
  type SceneRenderer,
  type SpriteGizmoHandle,
  type Vec2,
} from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import { clientPointToWorld } from "./viewport-math.js";
import {
  PixelGridOverlay,
  type PixelGridStyle,
} from "./pixel-grid.js";
import { clearVisual, paintVisualComponent } from "./visuals/index.js";
import type { VisualBounds } from "./visuals/types.js";
import {
  PixiRuntimeGraph,
  type RuntimeNode,
} from "./pixi-runtime-nodes.js";
import { PixiTextureCache } from "./pixi-texture-cache.js";
import { PixiNodeDragController } from "./pixi-node-drag.js";
import {
  PixiGizmoDragController,
  type GizmoDragHost,
} from "./pixi-gizmo-drag.js";
import type { NodeDragHost } from "./pixi-node-drag.js";
import {
  defaultVisualBounds,
  provisionalVisualBounds,
} from "./pixi-visual-bounds.js";
import { ViewportCameraController } from "./viewport-camera-controller.js";
import {
  visibleWorldRect,
  viewportChromeInvScale,
  type ViewportCameraState,
} from "./viewport-camera.js";
import { ScreenGuidesOverlay } from "./screen-guides.js";
import { DEFAULT_SNAP_GRID_SIZE } from "./snap-to-grid.js";
import {
  DEFAULT_EDITOR_BACKGROUND,
  EDITOR_ACCENT_COLOR,
  EDITOR_CHROME_FILL,
  EDITOR_GROUP_ORIGIN_MARKER_RADIUS,
  EDITOR_SELECTION_FILL_ALPHA,
  EDITOR_SELECTION_STROKE_WIDTH,
  PIXEL_GRID_VIEW_PAD,
} from "./editor-chrome.js";

export interface PixiSceneRendererOptions {
  canvasParent: HTMLElement;
  background?: number;
  /**
   * Resolve scene assetIds to fetchable URLs.
   * Prefer AssetResolver; a plain function is accepted for convenience.
   */
  assetResolver?: AssetResolver;
  /** @deprecated Prefer `assetResolver`. */
  resolveAssetUrl?: (assetId: string) => string | undefined;
  /**
   * Skip WebGL Application init (display-tree ops only).
   * Intended for unit tests of create/reparent/destroy identity.
   */
  headless?: boolean;
  /**
   * Editor-only pixel grid behind world content.
   * Off by default so game runtimes are unaffected.
   */
  pixelGrid?: boolean | Partial<PixelGridStyle>;
  /**
   * Editor-only popular screen-size outlines (LS/PT).
   * Off by default so game runtimes are unaffected.
   */
  screenGuides?: boolean;
  /**
   * When false, omit node drag, selection gizmos, grab cursors, and
   * editor preview camera pan/wheel zoom. Use for game runtime / preview.
   */
  editable?: boolean;
}

export interface PixiGizmoResizeResult {
  width: number;
  height: number;
}

export interface PixiGizmoAnchorResult {
  anchor: Vec2;
  position: Vec2;
}

export interface PixiPointerHandlers {
  onBackgroundPointerDown?: () => void;
  onNodePointerDown?: (nodeId: string, world: Vec2) => void;
  onNodePointerMove?: (nodeId: string, world: Vec2) => void;
  onNodePointerUp?: (nodeId: string, start: Vec2, end: Vec2) => void;
  onGizmoResizeEnd?: (nodeId: string, size: PixiGizmoResizeResult) => void;
  onGizmoRotateEnd?: (nodeId: string, rotation: number) => void;
  onGizmoAnchorEnd?: (nodeId: string, result: PixiGizmoAnchorResult) => void;
  onGizmoFlip?: (nodeId: string, axis: "x" | "y") => void;
}

export interface PixiSyncStats {
  created: number;
  destroyed: number;
  reparented: number;
  updated: number;
}

function hitAreaFromBounds(
  bounds: VisualBounds,
  cameraScale: number,
): Rectangle {
  const outset = spriteGizmoHitOutsets(cameraScale);
  return new Rectangle(
    bounds.x - outset.left,
    bounds.y - outset.top,
    bounds.width + outset.left + outset.right,
    bounds.height + outset.top + outset.bottom,
  );
}

/**
 * PixiJS scene renderer. Maps SceneNodeData → PIXI display objects.
 * Serialized domain data never stores PIXI instances.
 */
export class PixiSceneRenderer implements SceneRenderer {
  private app: Application | undefined;
  private readonly graph = new PixiRuntimeGraph();
  private readonly textureCache = new PixiTextureCache();
  private readonly nodeDrag = new PixiNodeDragController();
  private readonly gizmoDragController = new PixiGizmoDragController();
  private assetResolver: AssetResolver | undefined;
  private pointerHandlers: PixiPointerHandlers | undefined;
  private selectedNodeIds = new Set<string>();
  private width = 0;
  private height = 0;
  private readonly initPromise: Promise<void>;
  private ready = false;
  private readonly canvasParent: HTMLElement;
  private readonly background: number;
  private readonly headless: boolean;
  private readonly pixelGrid: PixelGridOverlay | undefined;
  private readonly screenGuides: ScreenGuidesOverlay | undefined;
  private readonly editable: boolean;
  private readonly camera = new ViewportCameraController();
  /** When set, node-move drags quantize to this world-space cell size. */
  private snapGridSize: number | undefined;
  /**
   * Pixi's ResizePlugin only listens to window `resize`. Dock panel splits
   * change the host without firing that, so we observe the parent ourselves.
   */
  private parentResizeObserver: ResizeObserver | undefined;
  private syncStats: PixiSyncStats = {
    created: 0,
    destroyed: 0,
    reparented: 0,
    updated: 0,
  };

  constructor(options: PixiSceneRendererOptions) {
    this.canvasParent = options.canvasParent;
    this.background = options.background ?? DEFAULT_EDITOR_BACKGROUND;
    this.headless = options.headless === true;
    this.pixelGrid =
      options.pixelGrid === undefined || options.pixelGrid === false
        ? undefined
        : new PixelGridOverlay(
            options.pixelGrid === true ? {} : options.pixelGrid,
          );
    this.screenGuides =
      options.screenGuides === true ? new ScreenGuidesOverlay() : undefined;
    this.editable = options.editable !== false;
    this.assetResolver =
      options.assetResolver ??
      (options.resolveAssetUrl
        ? { resolveUrl: options.resolveAssetUrl }
        : undefined);
    this.camera.subscribe(() => {
      this.redrawEditorOverlays();
    });
    this.initPromise = this.headless
      ? Promise.resolve().then(() => {
          this.ready = true;
        })
      : this.init();
  }

  whenReady(): Promise<void> {
    return this.initPromise;
  }

  isReady(): boolean {
    return this.ready;
  }

  setPointerHandlers(handlers: PixiPointerHandlers | undefined): void {
    this.pointerHandlers = handlers;
  }

  setAssetResolver(resolver: AssetResolver | undefined): void {
    this.assetResolver = resolver;
    this.invalidateStaleTextures();
    for (const runtime of this.graph.values()) {
      void this.paintVisuals(runtime);
    }
  }

  /** @deprecated Prefer setAssetResolver. */
  setAssetUrlResolver(
    resolveAssetUrl: ((assetId: string) => string | undefined) | undefined,
  ): void {
    this.setAssetResolver(
      resolveAssetUrl ? { resolveUrl: resolveAssetUrl } : undefined,
    );
  }

  invalidateAsset(assetId: string): void {
    if (!this.textureCache.evict(assetId)) {
      return;
    }
    for (const runtime of this.graph.values()) {
      const visual = getVisualComponent(runtime.node);
      if (!visual) {
        continue;
      }
      if ("assetId" in visual && visual.assetId === assetId) {
        void this.paintVisuals(runtime);
        continue;
      }
      if (
        visual.type === "AnimatedSprite" &&
        visual.frames.includes(assetId)
      ) {
        void this.paintVisuals(runtime);
      }
    }
  }

  invalidateAllTextures(): void {
    this.textureCache.evictAll();
    for (const runtime of this.graph.values()) {
      void this.paintVisuals(runtime);
    }
  }

  clientToWorld(clientX: number, clientY: number): Vec2 {
    const canvas = this.app?.canvas;
    if (!canvas || !this.app) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const camera = this.camera.getState();
    return clientPointToWorld({
      clientX,
      clientY,
      canvasLeft: rect.left,
      canvasTop: rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      panX: camera.pan.x,
      panY: camera.pan.y,
      scale: camera.scale,
    });
  }

  getViewportCamera(): Readonly<ViewportCameraState> {
    return this.camera.getState();
  }

  /** Preview-only scale (does not affect saved scene transforms). */
  setViewportScale(scale: number): void {
    this.camera.setScale(scale);
  }

  resetViewportCamera(): void {
    this.camera.reset();
  }

  subscribeViewportCamera(
    listener: (state: ViewportCameraState) => void,
  ): () => void {
    return this.camera.subscribe(listener);
  }

  setScreenGuidesVisible(visible: boolean): void {
    this.screenGuides?.setVisible(visible);
  }

  setScreenGuideOrientations(options: {
    landscape?: boolean;
    portrait?: boolean;
  }): void {
    this.screenGuides?.setOrientationFilter(options);
  }

  getScreenGuideOrientations(): { landscape: boolean; portrait: boolean } {
    return (
      this.screenGuides?.getOrientationFilter() ?? {
        landscape: true,
        portrait: true,
      }
    );
  }

  /**
   * Editor preference: snap node-move positions to a world grid while dragging.
   * Does not affect saved scene data until a transform is committed.
   */
  setSnapToGrid(
    enabled: boolean,
    gridSize: number = DEFAULT_SNAP_GRID_SIZE,
  ): void {
    this.snapGridSize = enabled && gridSize > 0 ? gridSize : undefined;
  }

  isSnapToGridEnabled(): boolean {
    return this.snapGridSize !== undefined;
  }

  getSnapGridSize(): number | undefined {
    return this.snapGridSize;
  }

  private async init(): Promise<void> {
    const app = new Application();
    await app.init({
      background: this.background,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      resizeTo: this.canvasParent,
    });
    this.app = app;
    this.canvasParent.appendChild(app.canvas);
    if (this.pixelGrid) {
      this.camera.root.addChild(this.pixelGrid.root);
    }
    if (this.screenGuides) {
      this.camera.root.addChild(this.screenGuides.root);
    }
    this.camera.root.addChild(this.graph.world);
    app.stage.addChild(this.camera.root);
    // Preview camera pan/wheel is editor-only; games must not get it.
    if (this.editable) {
      this.camera.attach(app);
    }
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointerdown", (event: FederatedPointerEvent) => {
      if (event.button === MOUSE_BUTTON_MIDDLE) {
        return;
      }
      if (event.target === app.stage) {
        this.pointerHandlers?.onBackgroundPointerDown?.();
      }
    });
    app.renderer.on("resize", () => {
      this.syncViewportSize();
    });
    // Keep buffer CSS-pixel size in sync with the host (no CSS bitmap stretch).
    this.parentResizeObserver = new ResizeObserver(() => {
      app.queueResize();
    });
    this.parentResizeObserver.observe(this.canvasParent);
    this.syncViewportSize();
    this.ready = true;
  }

  async destroy(): Promise<void> {
    await this.initPromise;
    this.parentResizeObserver?.disconnect();
    this.parentResizeObserver = undefined;
    this.clear();
    this.pointerHandlers = undefined;
    this.camera.detach();
    this.invalidateAllTextures();
    this.app?.destroy(true, { children: true });
    this.app = undefined;
    this.ready = false;
  }

  createNode(node: SceneNodeData): void {
    if (this.graph.has(node.id)) {
      this.updateNode(node);
      return;
    }
    const runtime = this.graph.create(node, {
      editable: this.editable,
      onGizmoHandlePointerDown: (live, handle, event) => {
        this.beginGizmoDrag(live, handle, event);
      },
    });
    if (this.editable) {
      this.nodeDrag.attach(runtime, this.asNodeDragHost());
    }
    this.paint(runtime);
    this.syncStats.created += 1;
  }

  updateNode(node: SceneNodeData): void {
    const runtime = this.graph.get(node.id);
    if (!runtime) {
      throw new Error(`PixiSceneRenderer: unknown node ${node.id}`);
    }
    runtime.node = node;
    this.syncStats.updated += 1;
    if (
      this.nodeDrag.isActiveFor(node.id) ||
      this.gizmoDragController.isActiveFor(node.id)
    ) {
      void this.paintVisuals(runtime);
      this.paintSelection(runtime);
      return;
    }
    runtime.sizePreview = undefined;
    runtime.anchorPreview = undefined;
    this.paint(runtime);
  }

  destroyNode(nodeId: string): void {
    const destroyed = this.graph.destroyNode(nodeId);
    this.syncStats.destroyed += destroyed;
  }

  clear(): void {
    this.graph.clear();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.redrawEditorOverlays();
  }

  setPixelGridVisible(visible: boolean): void {
    this.pixelGrid?.setVisible(visible);
    if (visible) {
      this.redrawEditorOverlays();
    }
  }

  private syncViewportSize(): void {
    const app = this.app;
    if (!app) {
      return;
    }
    this.width = app.screen.width;
    this.height = app.screen.height;
    app.stage.hitArea = app.screen;
    this.redrawEditorOverlays();
  }

  private redrawEditorOverlays(): void {
    const cameraScale = this.camera.getState().scale;
    if (this.pixelGrid) {
      const rect = visibleWorldRect(
        this.width,
        this.height,
        this.camera.getState(),
      );
      // Pad so lines stay continuous while panning.
      const pad = PIXEL_GRID_VIEW_PAD;
      this.pixelGrid.redrawBounds(
        rect.minX - pad,
        rect.minY - pad,
        rect.maxX + pad,
        rect.maxY + pad,
      );
    }
    this.screenGuides?.redraw(cameraScale);
    // Selection chrome + gizmo hit pads are screen-constant under zoom.
    for (const runtime of this.graph.values()) {
      if (runtime.visualBounds) {
        runtime.visualsRoot.hitArea = hitAreaFromBounds(
          runtime.visualBounds,
          cameraScale,
        );
      }
      if (this.selectedNodeIds.has(runtime.node.id)) {
        this.paintSelection(runtime);
      }
    }
  }

  render(): void {
    if (!this.editable) {
      return;
    }
    for (const runtime of this.graph.values()) {
      this.paintSelection(runtime);
    }
  }

  setSelectedNodeIds(nodeIds: readonly string[]): void {
    this.selectedNodeIds = new Set(nodeIds);
    this.render();
  }

  previewNodePosition(nodeId: string, position: Vec2): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.position.set(position.x, position.y);
  }

  previewSpriteSize(nodeId: string, width: number, height: number): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.sizePreview = { width, height };
    const sprite = getSprite(runtime.node);
    const anchor =
      runtime.anchorPreview ??
      (sprite ? getVisualAnchorOrDefault(sprite) : DEFAULT_VISUAL_ANCHOR);
    runtime.visualBounds = {
      x: -anchor.x * width,
      y: -anchor.y * height,
      width,
      height,
    };
    const leaf = runtime.visual as
      | { width?: number; height?: number }
      | undefined;
    if (leaf) {
      if (typeof leaf.width === "number") {
        leaf.width = width;
      }
      if (typeof leaf.height === "number") {
        leaf.height = height;
      }
    }
    void this.paintVisuals(runtime);
    this.paintSelection(runtime);
  }

  previewNodeRotation(nodeId: string, rotationDegrees: number): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.rotation = (rotationDegrees * Math.PI) / 180;
  }

  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.position.set(position.x, position.y);
    runtime.anchorPreview = { ...anchor };
    const sprite = getSprite(runtime.node);
    const width =
      runtime.sizePreview?.width ?? sprite?.width ?? DEFAULT_SPRITE_SIZE;
    const height =
      runtime.sizePreview?.height ?? sprite?.height ?? DEFAULT_SPRITE_SIZE;
    // Keep bounds + leaf pivot in sync before async paint finishes; otherwise
    // paintSelection would frame the old center and the texture would jump.
    runtime.visualBounds = {
      x: -anchor.x * width,
      y: -anchor.y * height,
      width,
      height,
    };
    const leaf = runtime.visual as
      | { anchor?: { set?: (x: number, y: number) => void } }
      | undefined;
    leaf?.anchor?.set?.(anchor.x, anchor.y);
    void this.paintVisuals(runtime);
    this.paintSelection(runtime);
  }

  getNodeCount(): number {
    return this.graph.size;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private paint(runtime: RuntimeNode): void {
    this.graph.applyTransform(
      runtime.container,
      getTransform2D(runtime.node),
    );
    void this.paintVisuals(runtime);
    this.paintSelection(runtime);
  }

  private async paintVisuals(runtime: RuntimeNode): Promise<void> {
    const visualData = getVisualComponent(runtime.node);
    runtime.placeholder.clear();
    // Never put hitArea on the node container — it would prune child sprites
    // whose local positions fall outside the parent's visual rect.
    runtime.container.hitArea = undefined;

    if (!visualData) {
      clearVisual(runtime.visual);
      runtime.visual = undefined;
      runtime.visualType = undefined;
      runtime.visualBounds = undefined;
      runtime.supportsSpriteGizmo = false;
      runtime.placeholder.visible = false;
      runtime.visualsRoot.hitArea = undefined;
      this.paintSelection(runtime);
      return;
    }

    // Apply live size / anchor previews for Sprite gizmo drags.
    let data = visualData;
    if (visualData.type === "Sprite" && getSprite(runtime.node)) {
      if (runtime.sizePreview || runtime.anchorPreview) {
        data = {
          ...visualData,
          ...(runtime.sizePreview
            ? {
                width: runtime.sizePreview.width,
                height: runtime.sizePreview.height,
              }
            : {}),
          ...(runtime.anchorPreview
            ? { anchor: { ...runtime.anchorPreview } }
            : {}),
        };
      }
    }

    const provisional = provisionalVisualBounds(data);
    if (provisional) {
      runtime.visualsRoot.hitArea = hitAreaFromBounds(
        provisional,
        this.camera.getState().scale,
      );
    }

    const result = await paintVisualComponent({
      node: runtime.node,
      data,
      visualsRoot: runtime.visualsRoot,
      visual: runtime.visual,
      visualType: runtime.visualType,
      textures: {
        loadTexture: (assetId, url) => this.loadTexture(assetId, url),
        resolveUrl: (assetId) => this.assetResolver?.resolveUrl(assetId),
        whiteTexture: () => Texture.WHITE,
      },
      assetResolver: this.assetResolver,
      showPlaceholder: (width, height, tint) => {
        this.graph.showPlaceholder(runtime, width, height, tint);
      },
      hidePlaceholder: () => {
        runtime.placeholder.visible = false;
      },
      warnMissingAsset: (assetId) => {
        if (!runtime.warnedMissingAsset) {
          runtime.warnedMissingAsset = true;
          console.warn("[renderer] missing asset", {
            category: "renderer",
            assetId,
            nodeId: runtime.node.id,
          });
        }
      },
    });

    if (!this.graph.has(runtime.node.id)) {
      return;
    }

    runtime.visual = result.visual;
    runtime.visualType = result.visualType;
    runtime.visualBounds = result.bounds;
    runtime.supportsSpriteGizmo = result.supportsSpriteGizmo === true;
    if (result.visual) {
      runtime.warnedMissingAsset = false;
    }

    const bounds =
      result.bounds ??
      provisional ??
      defaultVisualBounds(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE);
    runtime.visualsRoot.hitArea = hitAreaFromBounds(
      bounds,
      this.camera.getState().scale,
    );
    // Selection/gizmo depend on final bounds; paintSelection often runs before
    // this async paint resolves, so refresh once metrics are authoritative.
    this.paintSelection(runtime);
  }

  private async loadTexture(assetId: string, url: string): Promise<Texture> {
    const format =
      this.assetResolver?.resolveTextureFormat?.(assetId) ?? "png";
    return this.textureCache.load(assetId, url, format);
  }

  private invalidateStaleTextures(): void {
    this.textureCache.evictStale((assetId) =>
      this.assetResolver?.resolveUrl(assetId),
    );
  }

  private paintSelection(runtime: RuntimeNode): void {
    if (!this.editable) {
      return;
    }
    const selected = this.selectedNodeIds.has(runtime.node.id);
    const sprite = getSprite(runtime.node);
    const cameraScale = this.camera.getState().scale;
    const inv = viewportChromeInvScale(cameraScale);
    runtime.selection.clear();
    if (!selected) {
      runtime.gizmo?.setVisible(false);
      return;
    }

    if (sprite && runtime.supportsSpriteGizmo && runtime.gizmo) {
      const width =
        runtime.sizePreview?.width ??
        runtime.visualBounds?.width ??
        sprite.width ??
        DEFAULT_SPRITE_SIZE;
      const height =
        runtime.sizePreview?.height ??
        runtime.visualBounds?.height ??
        sprite.height ??
        DEFAULT_SPRITE_SIZE;
      const transform = getTransform2D(runtime.node);
      const flipX = (transform?.scale.x ?? 1) < 0;
      const flipY = (transform?.scale.y ?? 1) < 0;
      const anchor =
        runtime.anchorPreview ?? getVisualAnchorOrDefault(sprite);
      // Always derive center from live size+anchor. visualBounds lags behind
      // async paintVisuals and would leave the gizmo offset after anchor edits.
      const center = visualCenterFromAnchor(anchor, width, height);
      runtime.gizmo.root.position.set(center.x, center.y);
      runtime.gizmo.setVisible(true);
      runtime.gizmo.layout(width, height, { anchor, flipX, flipY }, cameraScale);
      return;
    }

    runtime.gizmo?.setVisible(false);
    if (runtime.visualBounds) {
      const { x, y, width, height } = runtime.visualBounds;
      runtime.selection.rect(x, y, width, height);
      runtime.selection.stroke({
        color: EDITOR_ACCENT_COLOR,
        width: EDITOR_SELECTION_STROKE_WIDTH * inv,
      });
      return;
    }
    // Grouping nodes have no default bounds graphic — mark origin only.
    runtime.selection.circle(0, 0, EDITOR_GROUP_ORIGIN_MARKER_RADIUS * inv);
    runtime.selection.fill({
      color: EDITOR_CHROME_FILL,
      alpha: EDITOR_SELECTION_FILL_ALPHA,
    });
    runtime.selection.stroke({
      color: EDITOR_ACCENT_COLOR,
      width: EDITOR_SELECTION_STROKE_WIDTH * inv,
    });
  }

  private beginGizmoDrag(
    runtime: RuntimeNode,
    handle: SpriteGizmoHandle,
    event: FederatedPointerEvent,
  ): void {
    this.gizmoDragController.begin(runtime, handle, event, this.asGizmoHost());
  }

  /**
   * Move an existing runtime container under a new parent at the given
   * *scene-sibling* index without recreating the object.
   */
  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void {
    this.graph.reparentNode(nodeId, parentId, index);
    this.syncStats.reparented += 1;
  }

  getRuntimeContainer(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.container;
  }

  /** Test/diagnostics: children root used for scene sibling ordering. */
  getRuntimeChildrenRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.childrenRoot;
  }

  /** Test/diagnostics: visuals root that owns sprite/placeholder hitArea. */
  getRuntimeVisualsRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.visualsRoot;
  }

  /** Test/diagnostics: leaf visual display object (Sprite, Text, …). */
  getRuntimeVisual(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.visual;
  }

  /** Test/diagnostics: selection gizmo root (local to visualsRoot). */
  getRuntimeGizmoRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.gizmo?.root;
  }

  getSyncStats(): Readonly<PixiSyncStats> {
    return { ...this.syncStats };
  }

  resetSyncStats(): void {
    this.syncStats = { created: 0, destroyed: 0, reparented: 0, updated: 0 };
  }

  private asNodeDragHost(): NodeDragHost {
    return {
      getApp: () => this.app,
      world: this.graph.world,
      isGizmoDragging: () => this.gizmoDragController.isDragging,
      getRuntime: (nodeId) => this.graph.get(nodeId),
      getSnapGridSize: () => this.snapGridSize,
      previewNodePosition: (nodeId, position) =>
        this.previewNodePosition(nodeId, position),
      onNodePointerDown: (nodeId, world) =>
        this.pointerHandlers?.onNodePointerDown?.(nodeId, world),
      onNodePointerMove: (nodeId, world) =>
        this.pointerHandlers?.onNodePointerMove?.(nodeId, world),
      onNodePointerUp: (nodeId, start, end) =>
        this.pointerHandlers?.onNodePointerUp?.(nodeId, start, end),
    };
  }

  private asGizmoHost(): GizmoDragHost {
    return {
      getApp: () => this.app,
      world: this.graph.world,
      getRuntime: (nodeId) => this.graph.get(nodeId),
      previewSpriteSize: (nodeId, width, height) =>
        this.previewSpriteSize(nodeId, width, height),
      previewNodeRotation: (nodeId, rotation) =>
        this.previewNodeRotation(nodeId, rotation),
      previewSpriteAnchor: (nodeId, anchor, position) =>
        this.previewSpriteAnchor(nodeId, anchor, position),
      paintVisuals: (runtime) => this.paintVisuals(runtime),
      paintSelection: (runtime) => this.paintSelection(runtime),
      paint: (runtime) => this.paint(runtime),
      onNodePointerDown: (nodeId, world) =>
        this.pointerHandlers?.onNodePointerDown?.(nodeId, world),
      onGizmoResizeEnd: (nodeId, size) =>
        this.pointerHandlers?.onGizmoResizeEnd?.(nodeId, size),
      onGizmoRotateEnd: (nodeId, rotation) =>
        this.pointerHandlers?.onGizmoRotateEnd?.(nodeId, rotation),
      onGizmoAnchorEnd: (nodeId, result) =>
        this.pointerHandlers?.onGizmoAnchorEnd?.(nodeId, result),
      onGizmoFlip: (nodeId, axis) =>
        this.pointerHandlers?.onGizmoFlip?.(nodeId, axis),
    };
  }
}
