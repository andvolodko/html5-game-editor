import type { Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import { sharedTileAnimationClock } from "@game-editor/assets";
import {
  getNodeVisible,
  getTransform2D,
  getVisualComponent,
  type SceneNodeData,
  type SceneRenderer,
  type SceneRenderStats,
  type SpriteGizmoHandle,
  type HitZoneComponentData,
  type MaskComponentData,
  type GraphicsShapeData,
  type Vec2,
  type LocalAabb,
} from "@game-editor/scene";
import { samplePixiRenderStats } from "./pixi-render-stats.js";
import {
  advanceHostDrivenVisuals,
  detachSharedTickerVisuals,
} from "./pixi-playback-visuals.js";
import { clientPointToScreen } from "./viewport-math.js";
import { PixelGridOverlay } from "./pixel-grid.js";
import { TilemapGridOverlay } from "./tilemap-grid-overlay.js";
import { evictTileTextureCache } from "./visuals/painters/tilemap.js";
import { PixiTilemapView } from "./pixi-tilemap-view.js";
import {
  PixiRuntimeGraph,
  type RuntimeNode,
} from "./pixi-runtime-nodes.js";
import { PixiRuntimeTransform2D } from "./pixi-runtime-transform-2d.js";
import { PixiTextureCache } from "./pixi-texture-cache.js";
import { PixiNodeDragController } from "./pixi-node-drag.js";
import { PixiNodeClickController } from "./pixi-node-click.js";
import { PixiGizmoDragController } from "./pixi-gizmo-drag.js";
import { PixiHitZoneDragController } from "./pixi-hit-zone-drag.js";
import { PixiMaskDragController } from "./pixi-mask-drag.js";
import { PixiGraphicsPolygonDragController } from "./pixi-graphics-polygon-drag.js";
import type { HitZoneGizmoHandle } from "./pixi-hit-zone-gizmo.js";
import { ViewportCameraController } from "./viewport-camera-controller.js";
import type { ViewportCameraState, WorldRect } from "./viewport-camera.js";
import { ScreenGuidesOverlay } from "./screen-guides.js";
import { DEFAULT_SNAP_GRID_SIZE } from "./snap-to-grid.js";
import { DEFAULT_EDITOR_BACKGROUND } from "./editor-chrome.js";
import { PixiMarqueeOverlay } from "./pixi-marquee-overlay.js";
import { PixiNodePainter } from "./pixi-node-painter.js";
import { applyPixiNodeContentAlpha } from "./pixi-node-alpha.js";
import {
  applyPlaybackPointerCursor,
  applyPlaybackPointerEventMode,
} from "./pixi-node-pointer.js";
import { pickRuntimeNodeId } from "./pixi-hit-zone-pick.js";
import { PixiNodePreviewController } from "./pixi-node-preview.js";
import { redrawEditorOverlays as syncEditorOverlays } from "./pixi-editor-overlay-sync.js";
import { PixiAppLifecycle } from "./pixi-app-lifecycle.js";
import {
  createGizmoDragHost,
  createNodeClickHost,
  createNodeDragHost,
  type InteractionHostSource,
} from "./pixi-interaction-hosts.js";
import type {
  PixiPointerHandlers,
  PixiSceneRendererOptions,
  PixiSyncStats,
} from "./pixi-scene-renderer-types.js";

export type {
  PixiSceneRendererOptions,
  PixiGizmoResizeResult,
  PixiGizmoAnchorResult,
  PixiPointerHandlers,
  PixiSyncStats,
} from "./pixi-scene-renderer-types.js";

/**
 * PixiJS scene renderer. Maps SceneNodeData → PIXI display objects.
 * Serialized domain data never stores PIXI instances.
 */
export class PixiSceneRenderer implements SceneRenderer {
  private readonly graph = new PixiRuntimeGraph();
  private readonly textureCache = new PixiTextureCache();
  private readonly nodeDrag = new PixiNodeDragController();
  private readonly nodeClick = new PixiNodeClickController();
  private readonly gizmoDragController = new PixiGizmoDragController();
  private readonly hitZoneDrag = new PixiHitZoneDragController();
  private readonly maskDrag = new PixiMaskDragController();
  private readonly graphicsPolygonDrag = new PixiGraphicsPolygonDragController();
  private readonly painter: PixiNodePainter;
  private readonly preview: PixiNodePreviewController;
  private readonly lifecycle: PixiAppLifecycle;
  private assetResolver: AssetResolver | undefined;
  private pointerHandlers: PixiPointerHandlers | undefined;
  private selectedNodeIds = new Set<string>();
  private readonly pixelGrid: PixelGridOverlay | undefined;
  private readonly tilemapGrid: TilemapGridOverlay | undefined;
  private readonly screenGuides: ScreenGuidesOverlay | undefined;
  private readonly marqueeOverlay: PixiMarqueeOverlay | undefined;
  private readonly editable: boolean;
  private readonly camera = new ViewportCameraController();
  /** When set, node-move drags quantize to this world-space cell size. */
  private snapGridSize: number | undefined;
  private playbackPaused = false;
  private syncStats: PixiSyncStats = {
    created: 0,
    destroyed: 0,
    reparented: 0,
    updated: 0,
  };

  constructor(options: PixiSceneRendererOptions) {
    this.pixelGrid =
      options.pixelGrid === undefined || options.pixelGrid === false
        ? undefined
        : new PixelGridOverlay(
            options.pixelGrid === true ? {} : options.pixelGrid,
          );
    this.screenGuides =
      options.screenGuides === true ? new ScreenGuidesOverlay() : undefined;
    this.tilemapGrid =
      options.editable !== false ? new TilemapGridOverlay() : undefined;
    this.marqueeOverlay =
      options.editable !== false ? new PixiMarqueeOverlay() : undefined;
    this.editable = options.editable !== false;
    this.assetResolver =
      options.assetResolver ??
      (options.resolveAssetUrl
        ? { resolveUrl: options.resolveAssetUrl }
        : undefined);
    this.painter = new PixiNodePainter({
      editable: this.editable,
      graph: this.graph,
      textureCache: this.textureCache,
      getSelectedNodeIds: () => this.selectedNodeIds,
      getCameraScale: () => this.camera.getState().scale,
      getAssetResolver: () => this.assetResolver,
      onPlaybackHitTargetReady: (runtime) => {
        if (this.editable) {
          return;
        }
        this.nodeClick.attachHitTarget(
          runtime,
          createNodeClickHost(this.interactionSource()),
        );
      },
    });
    this.preview = new PixiNodePreviewController({
      getRuntime: (nodeId) => this.graph.get(nodeId),
      paintVisuals: (runtime) => this.painter.paintVisuals(runtime),
      paintSelection: (runtime) => this.painter.paintSelection(runtime),
    });
    this.lifecycle = new PixiAppLifecycle(
      {
        canvasParent: options.canvasParent,
        background: options.background ?? DEFAULT_EDITOR_BACKGROUND,
        backgroundAlpha: options.backgroundAlpha ?? 1,
        designResolution: options.designResolution
          ? {
              width: Math.max(1, Math.floor(options.designResolution.width)),
              height: Math.max(1, Math.floor(options.designResolution.height)),
            }
          : undefined,
        editable: this.editable,
        camera: this.camera,
        graph: this.graph,
        pixelGrid: this.pixelGrid,
        screenGuides: this.screenGuides,
        marqueeRoot: this.marqueeOverlay?.root,
        onBackgroundPointerDown: () => {
          this.pointerHandlers?.onBackgroundPointerDown?.();
        },
        onWorldPointerDown: (world, button, modifiers, client) =>
          this.pointerHandlers?.onWorldPointerDown?.(
            world,
            button,
            modifiers,
            client,
          ) === true,
        onWorldPointerMove: (world) => {
          this.pointerHandlers?.onWorldPointerMove?.(world);
        },
        onWorldPointerUp: (world) => {
          this.pointerHandlers?.onWorldPointerUp?.(world);
        },
        onResize: () => {
          this.lifecycle.syncViewportSize();
          this.redrawEditorOverlays();
        },
        onTick: (ticker) => {
          if (this.playbackPaused) {
            return;
          }
          this.advanceTileAnimations(ticker.deltaMS);
          advanceHostDrivenVisuals(this.graph.values(), ticker);
        },
      },
      options.headless === true,
    );
    this.camera.subscribe(() => {
      this.redrawEditorOverlays();
    });
  }

  whenReady(): Promise<void> {
    return this.lifecycle.whenReady();
  }

  isReady(): boolean {
    return this.lifecycle.isReady();
  }

  setPointerHandlers(handlers: PixiPointerHandlers | undefined): void {
    this.pointerHandlers = handlers;
  }

  setPlaybackPaused(paused: boolean): void {
    this.playbackPaused = paused;
    if (paused) {
      detachSharedTickerVisuals(this.graph.values());
    }
    this.lifecycle.setTickerPaused(paused);
  }

  setAssetResolver(resolver: AssetResolver | undefined): void {
    this.assetResolver = resolver;
    this.painter.invalidateStaleTextures();
    for (const runtime of this.graph.values()) {
      void this.painter.paintVisuals(runtime);
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
    this.textureCache.evict(assetId);
    evictTileTextureCache(assetId);
    sharedTileAnimationClock().invalidate(assetId);
    for (const runtime of this.graph.values()) {
      const visual = getVisualComponent(runtime.node);
      if (!visual) {
        continue;
      }
      if ("assetId" in visual && visual.assetId === assetId) {
        void this.painter.paintVisuals(runtime);
        continue;
      }
      if (
        visual.type === "AnimatedSprite" &&
        visual.frames.includes(assetId)
      ) {
        void this.painter.paintVisuals(runtime);
        continue;
      }
      if (visual.type === "Tilemap") {
        const tileset = visual.tileSetId
          ? this.assetResolver?.resolveTileSet?.(visual.tileSetId)
          : undefined;
        if (
          visual.tileSetId === assetId ||
          tileset?.imageAssetId === assetId
        ) {
          void this.painter.paintVisuals(runtime);
        }
      }
    }
  }

  private advanceTileAnimations(deltaMs: number): void {
    const changed = sharedTileAnimationClock().advance(deltaMs);
    if (changed.size === 0) {
      return;
    }
    for (const runtime of this.graph.values()) {
      if (runtime.visual instanceof PixiTilemapView) {
        runtime.visual.applyAnimationFrames(changed);
      }
    }
  }

  invalidateAllTextures(): void {
    this.textureCache.evictAll();
    for (const runtime of this.graph.values()) {
      void this.painter.paintVisuals(runtime);
    }
  }

  clientToWorld(clientX: number, clientY: number): Vec2 {
    return this.lifecycle.clientToWorld(clientX, clientY);
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

  setViewportCamera(state: Readonly<ViewportCameraState>): void {
    this.camera.replaceState(state);
  }

  frameWorldRect(rect: WorldRect, padding?: number): void {
    this.camera.frameWorldRect(rect, padding);
  }

  /** Copy preview camera (hybrid layer sync). Does not emit subscribe events. */
  applyViewportCamera(state: Readonly<ViewportCameraState>): void {
    this.camera.applyExternalState(state);
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

  async destroy(): Promise<void> {
    this.clear();
    this.pointerHandlers = undefined;
    this.marqueeOverlay?.destroy();
    this.tilemapGrid?.destroy();
    // Drop local cache entries only — URL refcounts in PixiTextureCache keep
    // shared Assets textures alive for any other live renderer (Scene vs Preview).
    this.textureCache.evictAll();
    evictTileTextureCache();
    await this.lifecycle.destroy();
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
      onHitZoneHandlePointerDown: (live, handle, event) => {
        this.beginHitZoneDrag(live, handle, event);
      },
      onHitZoneBodyPointerDown: (live, event) => {
        this.beginHitZoneMove(live, event);
      },
      onMaskHandlePointerDown: (live, handle, event) => {
        this.beginMaskDrag(live, handle, event);
      },
      onMaskBodyPointerDown: (live, event) => {
        this.beginMaskMove(live, event);
      },
      onGraphicsPolygonHandlePointerDown: (live, handle, event) => {
        this.beginGraphicsPolygonDrag(live, handle, event);
      },
    });
    if (this.editable) {
      this.nodeDrag.attach(runtime, createNodeDragHost(this.interactionSource()));
    } else {
      this.nodeClick.attach(
        runtime,
        createNodeClickHost(this.interactionSource()),
      );
    }
    this.painter.paint(runtime);
    this.applyDisplayVisible(runtime);
    this.applyDisplayAlpha(runtime);
    applyPlaybackPointerCursor(runtime);
    applyPlaybackPointerEventMode(runtime);
    this.syncStats.created += 1;
  }

  updateNode(node: SceneNodeData): void {
    const runtime = this.graph.get(node.id);
    if (!runtime) {
      throw new Error(`PixiSceneRenderer: unknown node ${node.id}`);
    }
    runtime.node = node;
    this.applyDisplayVisible(runtime);
    this.applyDisplayAlpha(runtime);
    applyPlaybackPointerCursor(runtime);
    applyPlaybackPointerEventMode(runtime);
    this.graph.syncDisplayLabels(node.id);
    this.syncStats.updated += 1;
    if (
      this.nodeDrag.isActiveFor(node.id) ||
      this.gizmoDragController.isActiveFor(node.id) ||
      this.hitZoneDrag.isActiveFor(node.id) ||
      this.maskDrag.isActiveFor(node.id) ||
      this.graphicsPolygonDrag.isActiveFor(node.id)
    ) {
      void this.painter.paintVisuals(runtime);
      this.painter.paintSelection(runtime);
      return;
    }
    runtime.sizePreview = undefined;
    runtime.anchorPreview = undefined;
    if (!this.hitZoneDrag.isActiveFor(node.id)) {
      runtime.hitZonePreview = undefined;
    }
    if (!this.maskDrag.isActiveFor(node.id)) {
      runtime.maskPreview = undefined;
    }
    if (!this.graphicsPolygonDrag.isActiveFor(node.id)) {
      runtime.graphicsShapePreview = undefined;
    }
    // Playback pose is owned by `ctx.transform` (live Pixi handle), not scene
    // Transform2D. Re-applying the authored pose here snaps units back to spawn
    // on every visual refresh (AnimatedSprite clip, text, sprite asset).
    this.painter.paint(runtime, { applyTransform: this.editable });
  }

  syncTransform(node: SceneNodeData): void {
    const runtime = this.graph.get(node.id);
    if (!runtime) {
      throw new Error(`PixiSceneRenderer: unknown node ${node.id}`);
    }
    runtime.node = node;
    this.graph.applyTransform(runtime.container, getTransform2D(node));
  }

  destroyNode(nodeId: string): void {
    this.tilemapGrid?.root.removeFromParent();
    const parentId = this.graph.get(nodeId)?.node.parentId;
    const destroyed = this.graph.destroyNode(nodeId);
    this.syncStats.destroyed += destroyed;
    if (parentId) {
      this.painter.refreshGroupingNode(parentId);
    }
  }

  clear(): void {
    this.tilemapGrid?.root.removeFromParent();
    this.graph.clear();
  }

  resize(width: number, height: number): void {
    this.lifecycle.resize(width, height);
    this.redrawEditorOverlays();
  }

  setPixelGridVisible(visible: boolean): void {
    this.pixelGrid?.setVisible(visible);
    if (visible) {
      this.redrawEditorOverlays();
    }
  }

  private redrawEditorOverlays(): void {
    const size = this.lifecycle.getSize();
    syncEditorOverlays({
      width: size.width,
      height: size.height,
      graph: this.graph,
      pixelGrid: this.pixelGrid,
      tilemapGrid: this.tilemapGrid,
      screenGuides: this.screenGuides,
      getCameraState: () => this.camera.getState(),
      getSelectedNodeIds: () => this.selectedNodeIds,
      paintSelection: (runtime) => this.painter.paintSelection(runtime),
    });
  }

  render(): void {
    if (!this.editable) {
      if (this.playbackPaused) {
        this.lifecycle.renderFrame();
      }
      return;
    }
    for (const runtime of this.graph.values()) {
      this.painter.paintSelection(runtime);
    }
  }

  setSelectedNodeIds(nodeIds: readonly string[]): void {
    this.selectedNodeIds = new Set(nodeIds);
    this.syncGroupingChildHits();
    this.render();
  }

  /** Editor rubber-band in world space. Pass undefined to hide. */
  setMarqueeWorldRect(rect: LocalAabb | undefined): void {
    this.marqueeOverlay?.setWorldRect(rect, this.camera.getState().scale);
  }

  /**
   * Selected grouping nodes swallow descendant hits so move/scale/rotate
   * apply to the container. Children become hittable again when deselected.
   */
  private syncGroupingChildHits(): void {
    for (const runtime of this.graph.values()) {
      if (!runtime.editable || !runtime.childrenRoot) {
        continue;
      }
      const grouping = getVisualComponent(runtime.node) === undefined;
      runtime.childrenRoot.interactiveChildren =
        !grouping || !this.selectedNodeIds.has(runtime.node.id);
    }
  }

  previewNodePosition(nodeId: string, position: Vec2): void {
    this.preview.previewNodePosition(nodeId, position);
  }

  previewSpriteSize(nodeId: string, width: number, height: number): void {
    this.preview.previewSpriteSize(nodeId, width, height);
  }

  previewNodeRotation(nodeId: string, rotationDegrees: number): void {
    this.preview.previewNodeRotation(nodeId, rotationDegrees);
  }

  previewNodeScale(nodeId: string, scale: Vec2): void {
    this.preview.previewNodeScale(nodeId, scale);
  }

  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void {
    this.preview.previewSpriteAnchor(nodeId, anchor, position);
  }

  getNodeCount(): number {
    return this.graph.size;
  }

  hasNode(nodeId: string): boolean {
    return this.graph.has(nodeId);
  }

  getRuntimeTransform2D(nodeId: string) {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return undefined;
    }
    let transform = runtime.runtimeTransform;
    if (!transform) {
      transform = new PixiRuntimeTransform2D(runtime.container);
      runtime.runtimeTransform = transform;
    }
    return transform;
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.visible = visible;
  }

  setNodeResolvedVisible(nodeId: string, visible: boolean): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.visible = visible && !runtime.editorHidden;
  }

  setNodeEditorHidden(nodeId: string, hidden: boolean): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.editorHidden = hidden;
    this.applyDisplayVisible(runtime);
  }

  private applyDisplayVisible(runtime: RuntimeNode): void {
    runtime.container.visible =
      getNodeVisible(runtime.node) && !runtime.editorHidden;
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    applyPixiNodeContentAlpha(runtime, alpha);
  }

  private applyDisplayAlpha(runtime: RuntimeNode): void {
    applyPixiNodeContentAlpha(runtime);
  }

  setNodeLocked(nodeId: string, locked: boolean): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.editorLocked = locked;
    if (runtime.editable) {
      const cursor = locked ? "default" : "grab";
      runtime.container.cursor = cursor;
      runtime.visualsRoot.cursor = cursor;
      this.painter.paintSelection(runtime);
    }
  }

  setNodeCursor(nodeId: string, cursor: string): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.cursor = cursor;
    runtime.visualsRoot.cursor = cursor;
    if (runtime.hitZoneTarget) {
      runtime.hitZoneTarget.cursor = cursor;
    }
  }

  getNodeCursor(nodeId: string): string | undefined {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return undefined;
    }
    const cursor = runtime.container.cursor;
    if (typeof cursor !== "string" || cursor.length === 0) {
      return undefined;
    }
    return cursor;
  }

  /**
   * Hit-test a client point against visible node visuals (smallest area wins).
   * Used by hybrid preview input when canvases do not receive DOM events.
   * Playback skips HitZone children and `pointerEventMode: none` so overlay
   * taps land on the same node Pixi's EventSystem would use.
   */
  pickNodeId(clientX: number, clientY: number): string | undefined {
    const app = this.lifecycle.app;
    const canvas = app?.canvas;
    if (!app || !canvas) {
      return undefined;
    }
    const rect = canvas.getBoundingClientRect();
    const screen = clientPointToScreen({
      clientX,
      clientY,
      canvasLeft: rect.left,
      canvasTop: rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
    });
    const visible: RuntimeNode[] = [];
    for (const runtime of this.graph.values()) {
      if (!isPixiWorldVisible(runtime.container)) {
        continue;
      }
      visible.push(runtime);
    }
    return pickRuntimeNodeId(visible, screen, (nodeId) => this.graph.get(nodeId));
  }

  getSize(): { width: number; height: number } {
    return this.lifecycle.getSize();
  }

  private beginGizmoDrag(
    runtime: RuntimeNode,
    handle: SpriteGizmoHandle,
    event: FederatedPointerEvent,
  ): void {
    this.gizmoDragController.begin(
      runtime,
      handle,
      event,
      createGizmoDragHost(this.interactionSource()),
    );
  }

  private beginHitZoneDrag(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
  ): void {
    this.hitZoneDrag.beginHandle(runtime, handle, event, this.hitZoneDragHost());
  }

  private beginHitZoneMove(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
  ): void {
    this.hitZoneDrag.beginMove(runtime, event, this.hitZoneDragHost());
  }

  private hitZoneDragHost() {
    return {
      getApp: () => this.lifecycle.app,
      world: this.graph.world,
      getRuntime: (nodeId: string) => this.graph.get(nodeId),
      previewHitZone: (nodeId: string, hitZone: HitZoneComponentData) =>
        this.previewHitZone(nodeId, hitZone),
      paintSelection: (nodeId: string) => {
        const live = this.graph.get(nodeId);
        if (live) {
          this.painter.paintSelection(live);
        }
      },
      onHitZoneResizeEnd: (nodeId: string, hitZone: HitZoneComponentData) =>
        this.pointerHandlers?.onHitZoneResizeEnd?.(nodeId, hitZone),
    };
  }

  private beginMaskDrag(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
  ): void {
    this.maskDrag.beginHandle(runtime, handle, event, this.maskDragHost());
  }

  private beginMaskMove(
    runtime: RuntimeNode,
    event: FederatedPointerEvent,
  ): void {
    this.maskDrag.beginMove(runtime, event, this.maskDragHost());
  }

  private maskDragHost() {
    return {
      getApp: () => this.lifecycle.app,
      world: this.graph.world,
      getRuntime: (nodeId: string) => this.graph.get(nodeId),
      previewMask: (nodeId: string, mask: MaskComponentData) =>
        this.previewMask(nodeId, mask),
      paintSelection: (nodeId: string) => {
        const live = this.graph.get(nodeId);
        if (live) {
          this.painter.paintSelection(live);
        }
      },
      onMaskResizeEnd: (nodeId: string, mask: MaskComponentData) =>
        this.pointerHandlers?.onMaskResizeEnd?.(nodeId, mask),
    };
  }

  private previewMask(nodeId: string, mask: MaskComponentData): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.maskPreview = mask;
    this.painter.paintSelection(runtime);
  }

  private beginGraphicsPolygonDrag(
    runtime: RuntimeNode,
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
  ): void {
    this.graphicsPolygonDrag.beginHandle(
      runtime,
      handle,
      event,
      this.graphicsPolygonDragHost(),
    );
  }

  private graphicsPolygonDragHost() {
    return {
      getApp: () => this.lifecycle.app,
      world: this.graph.world,
      getRuntime: (nodeId: string) => this.graph.get(nodeId),
      previewGraphicsShape: (nodeId: string, shape: GraphicsShapeData) =>
        this.previewGraphicsShape(nodeId, shape),
      paintSelection: (nodeId: string) => {
        const live = this.graph.get(nodeId);
        if (live) {
          this.painter.paintSelection(live);
        }
      },
      onGraphicsPolygonEnd: (nodeId: string, shape: GraphicsShapeData) =>
        this.pointerHandlers?.onGraphicsPolygonEnd?.(nodeId, shape),
    };
  }

  private previewGraphicsShape(nodeId: string, shape: GraphicsShapeData): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.graphicsShapePreview = shape;
    void this.painter.paintVisuals(runtime);
    this.painter.paintSelection(runtime);
  }

  private previewHitZone(nodeId: string, hitZone: HitZoneComponentData): void {
    const runtime = this.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    runtime.hitZonePreview = hitZone;
    this.painter.refreshChromeHitArea(runtime);
    this.painter.paintSelection(runtime);
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
    const oldParentId = this.graph.get(nodeId)?.node.parentId;
    this.graph.reparentNode(nodeId, parentId, index);
    this.syncStats.reparented += 1;
    if (oldParentId) {
      this.painter.refreshGroupingNode(oldParentId);
    }
    if (parentId) {
      this.painter.refreshGroupingNode(parentId);
    }
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

  /** Test/diagnostics: playback HitZone hit target. */
  getRuntimeHitZoneTarget(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.hitZoneTarget;
  }

  /** Test/diagnostics: editor HitZone overlay. */
  getRuntimeHitZoneOverlay(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.hitZoneOverlay;
  }

  getRuntimeHitZoneGizmoRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.hitZoneGizmo?.root;
  }

  getRuntimeContentRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.contentRoot;
  }

  getRuntimeChromeRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.chromeRoot;
  }

  getRuntimeMaskStencil(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.maskStencil;
  }

  getRuntimeMaskOverlay(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.maskOverlay;
  }

  getRuntimeMaskGizmoRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.maskGizmo?.root;
  }

  getRuntimeGraphicsPolygonGizmoRoot(nodeId: string): Container | undefined {
    return this.graph.get(nodeId)?.graphicsPolygonGizmo?.root;
  }

  getSyncStats(): Readonly<PixiSyncStats> {
    return { ...this.syncStats };
  }

  resetSyncStats(): void {
    this.syncStats = { created: 0, destroyed: 0, reparented: 0, updated: 0 };
  }

  getRenderStats(): SceneRenderStats {
    return samplePixiRenderStats(this.lifecycle.app);
  }

  private interactionSource(): InteractionHostSource {
    return {
      getApp: () => this.lifecycle.app,
      world: this.graph.world,
      isGizmoDragging: () =>
        this.gizmoDragController.isDragging ||
        this.hitZoneDrag.isDragging ||
        this.maskDrag.isDragging ||
        this.graphicsPolygonDrag.isDragging,
      getRuntime: (nodeId) => this.graph.get(nodeId),
      getSnapGridSize: () => this.snapGridSize,
      getSelectedNodeIds: () => this.selectedNodeIds,
      getPointerHandlers: () => this.pointerHandlers,
      pickNodeId: (clientX, clientY) => this.pickNodeId(clientX, clientY),
      previewNodePosition: (nodeId, position) =>
        this.preview.previewNodePosition(nodeId, position),
      previewSpriteSize: (nodeId, width, height) =>
        this.preview.previewSpriteSize(nodeId, width, height),
      previewNodeRotation: (nodeId, rotation) =>
        this.preview.previewNodeRotation(nodeId, rotation),
      previewNodeScale: (nodeId, scale) =>
        this.preview.previewNodeScale(nodeId, scale),
      previewSpriteAnchor: (nodeId, anchor, position) =>
        this.preview.previewSpriteAnchor(nodeId, anchor, position),
      paintVisuals: (runtime) => this.painter.paintVisuals(runtime),
      paintSelection: (runtime) => this.painter.paintSelection(runtime),
      paint: (runtime) => this.painter.paint(runtime),
    };
  }
}

function isPixiWorldVisible(container: Container): boolean {
  let current: Container | null = container;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}
