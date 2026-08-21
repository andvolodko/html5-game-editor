import type { AssetResolver } from "@game-editor/assets";
import {
  getLeafThreeComponent,
  getModel3D,
  getNodeVisible,
  getPerspectiveCamera,
  type SceneNodeData,
  type SceneRenderStats,
  type SceneRenderer,
  type Vec2,
} from "@game-editor/scene";
import {
  Color,
  GridHelper,
  Group,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { resolveActiveCamera } from "./three-active-camera.js";
import { sampleThreeRenderStats } from "./three-render-stats.js";
import {
  DEFAULT_THREE_BACKGROUND,
  EDITOR_CAMERA_FAR,
  EDITOR_CAMERA_FOV,
  EDITOR_CAMERA_NEAR,
  EDITOR_CAMERA_POSITION,
  EDITOR_GRID_DIVISIONS,
  EDITOR_GRID_SIZE,
} from "./three-constants.js";
import {
  tagObjectWithNodeId,
  ThreeEditorTools,
  findTaggedNodeId,
  isObjectWorldVisible,
} from "./three-editor-tools.js";
import { ThreeEditorNodeHelpers } from "./three-editor-node-helpers.js";
import { measurePlaybackParentSize } from "@game-editor/project";
import { applyPlaybackCanvasLayout } from "./playback-canvas-layout.js";
import {
  isPlaceholderObject,
  ThreeGltfCache,
} from "./three-gltf-cache.js";
import {
  bindModelAnimation,
  disposeMixer,
  syncModelAnimation,
  updateMixers,
} from "./three-model-animation.js";
import {
  snapshotModelPlayback,
  ThreeRuntimeGraph,
  type ThreeRuntimeEntry,
} from "./three-runtime-nodes.js";
import { ThreeRuntimeTransform3D } from "./three-runtime-transform-3d.js";
import { readBoneWorldTransform } from "./three-bone-world.js";
import {
  clientPointToLetterboxNdc,
  computeDesignLetterbox,
  designCameraAspect,
  letterboxToThreeViewport,
  type DesignLetterbox,
  type DesignResolution,
} from "./three-design-viewport.js";
import type {
  ThreePointerHandlers,
  ThreeSceneRendererOptions,
} from "./three-scene-renderer-types.js";
import {
  applyThreeLightOrCameraProps,
  applyThreeTransform,
  buildThreeObject,
  createThreePlaceholder,
} from "./three-object-factory.js";

export type {
  ThreeSceneRendererOptions,
  ThreePointerHandlers,
  ThreeGizmoDragEnd,
} from "./three-scene-renderer-types.js";

/**
 * Three.js scene renderer. Maps SceneNodeData → Object3D.
 * Serialized domain data never stores THREE instances.
 */
export class ThreeSceneRenderer implements SceneRenderer {
  private readonly graph = new ThreeRuntimeGraph();
  private readonly gltfCache: ThreeGltfCache;
  private readonly ownsGltfCache: boolean;
  private readonly rootScene = new Scene();
  private readonly worldRoot = new Group();
  private readonly editable: boolean;
  private readonly autoRender: boolean;
  private viewMode: "editor" | "camera" = "camera";
  private readonly headless: boolean;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly backgroundAlpha: number;
  private pointerHandlers: ThreePointerHandlers | undefined;
  private selectedNodeIds = new Set<string>();
  private width = 0;
  private height = 0;
  private renderer: WebGLRenderer | undefined;
  private editorCamera: PerspectiveCamera | undefined;
  private editorTools: ThreeEditorTools | undefined;
  private nodeHelpers: ThreeEditorNodeHelpers | undefined;
  private rafId = 0;
  private ready: Promise<void>;
  private destroyed = false;
  private canvasParent: HTMLElement | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private lastFrameMs = 0;
  /** Coalesce ResizeObserver bursts onto one animation frame. */
  private resizeRafId = 0;
  private pendingResize: { width: number; height: number } | undefined;
  private playbackPaused = false;
  private readonly designResolution: DesignResolution | undefined;
  /** Top-left letterbox when `designResolution` is set. */
  private designView: DesignLetterbox | undefined;

  constructor(options: ThreeSceneRendererOptions = {}) {
    this.headless = options.headless === true;
    this.editable = options.editable !== false;
    this.autoRender = options.autoRender ?? this.editable;
    this.canvasParent = options.canvasParent;
    this.backgroundAlpha = options.backgroundAlpha ?? 1;
    this.designResolution = options.designResolution
      ? {
          width: Math.max(1, Math.floor(options.designResolution.width)),
          height: Math.max(1, Math.floor(options.designResolution.height)),
        }
      : undefined;
    this.ownsGltfCache = options.gltfCache === undefined;
    this.gltfCache = options.gltfCache ?? new ThreeGltfCache();
    this.gltfCache.setResolver(options.assetResolver);
    this.gltfCache.setLoadErrorHandler(
      options.onGltfLoadError ??
        ((id, err) => {
          console.warn(`[ThreeSceneRenderer] glTF load failed: ${id}`, err);
        }),
    );
    this.rootScene.add(this.worldRoot);
    if (this.backgroundAlpha >= 1) {
      this.rootScene.background = new Color(
        options.background ?? DEFAULT_THREE_BACKGROUND,
      );
    } else {
      this.rootScene.background = null;
    }

    if (this.headless || !options.canvasParent) {
      this.ready = Promise.resolve();
      return;
    }

    this.ready = this.initWebGl(options.canvasParent, options.background);
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.resizeRafId !== 0) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = 0;
    }
    this.pendingResize = undefined;
    this.editorTools?.dispose();
    this.editorTools = undefined;
    this.nodeHelpers?.dispose();
    this.nodeHelpers = undefined;
    this.clear();
    if (this.ownsGltfCache) {
      this.gltfCache.clear();
    }
    const canvas = this.renderer?.domElement;
    this.renderer?.dispose();
    this.renderer = undefined;
    if (canvas?.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
    this.editorCamera = undefined;
  }

  setAssetResolver(resolver: AssetResolver | undefined): void {
    this.gltfCache.setResolver(resolver);
    for (const [nodeId, entry] of this.graph.entries()) {
      if (entry.kind === "Model3D" && entry.assetId) {
        this.gltfCache.invalidate(entry.assetId);
        void this.repaintModel(nodeId);
      }
    }
  }

  setPointerHandlers(handlers: ThreePointerHandlers | undefined): void {
    this.pointerHandlers = handlers;
    this.editorTools?.setHandlers(handlers);
  }

  setSelectedNodeIds(ids: readonly string[]): void {
    this.selectedNodeIds = new Set(ids);
    this.editorTools?.setSelectedNodeIds(ids);
  }

  setTransformMode(mode: "translate" | "rotate" | "scale"): void {
    this.editorTools?.setTransformMode(mode);
  }

  getTransformMode(): "translate" | "rotate" | "scale" {
    return this.editorTools?.getTransformMode() ?? "translate";
  }

  /**
   * Editor Scene panel: "camera" matches Preview (active scene camera);
   * "editor" is free orbit for placing lights/helpers.
   */
  setViewMode(mode: "editor" | "camera"): void {
    this.viewMode = mode;
    this.syncViewCameraToTools();
  }

  getViewMode(): "editor" | "camera" {
    return this.viewMode;
  }

  /**
   * Project client coords onto the XZ plane (y=0) for asset drops.
   * Returned as Vec2 where x→world.x and y→world.z.
   */
  clientToWorld(clientX: number, clientY: number): Vec2 {
    const camera = this.resolveViewCamera();
    const canvas = this.renderer?.domElement;
    if (!camera || !canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    if (!this.writePickNdc(clientX, clientY, rect)) {
      return { x: 0, y: 0 };
    }
    this.raycaster.setFromCamera(this.ndc, camera);
    const origin = this.raycaster.ray.origin;
    const direction = this.raycaster.ray.direction;
    if (Math.abs(direction.y) < 1e-6) {
      return { x: origin.x, y: origin.z };
    }
    const t = -origin.y / direction.y;
    const hit = new Vector3().copy(origin).addScaledVector(direction, t);
    return { x: hit.x, y: hit.z };
  }

  hasNode(nodeId: string): boolean {
    return this.graph.has(nodeId);
  }

  getRuntimeTransform3D(nodeId: string) {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return undefined;
    }
    let transform = entry.runtimeTransform;
    if (!transform) {
      transform = new ThreeRuntimeTransform3D(entry.object);
      entry.runtimeTransform = transform;
    }
    return transform;
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    entry.object.visible = visible;
    if (this.selectedNodeIds.has(nodeId)) {
      this.setSelectedNodeIds([...this.selectedNodeIds]);
    }
  }

  setNodeResolvedVisible(nodeId: string, visible: boolean): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    entry.runtimeVisible = visible;
    this.applyDisplayVisible(entry);
    if (this.selectedNodeIds.has(nodeId)) {
      this.setSelectedNodeIds([...this.selectedNodeIds]);
    }
  }

  setNodeEditorHidden(nodeId: string, hidden: boolean): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    entry.editorHidden = hidden;
    this.applyDisplayVisible(entry);
    if (this.selectedNodeIds.has(nodeId)) {
      this.setSelectedNodeIds([...this.selectedNodeIds]);
    }
  }

  private applyDisplayVisible(entry: ThreeRuntimeEntry): void {
    entry.object.visible =
      entry.runtimeVisible !== false && entry.editorHidden !== true;
  }

  setNodeLocked(nodeId: string, locked: boolean): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    entry.editorLocked = locked;
    if (this.selectedNodeIds.has(nodeId)) {
      this.setSelectedNodeIds([...this.selectedNodeIds]);
    }
  }

  pickNodeId(clientX: number, clientY: number): string | undefined {
    if (this.editorTools) {
      return this.editorTools.pickNodeId(clientX, clientY);
    }
    const camera = this.resolveViewCamera();
    const canvas = this.renderer?.domElement;
    if (!canvas) {
      return undefined;
    }
    const rect = canvas.getBoundingClientRect();
    if (!this.writePickNdc(clientX, clientY, rect)) {
      return undefined;
    }
    this.raycaster.setFromCamera(this.ndc, camera);
    const roots: Object3D[] = [];
    for (const [, entry] of this.graph.entries()) {
      if (!isObjectWorldVisible(entry.object)) {
        continue;
      }
      roots.push(entry.object);
    }
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      const nodeId = findTaggedNodeId(hit.object);
      if (nodeId) {
        return nodeId;
      }
    }
    return undefined;
  }

  createNode(node: SceneNodeData): void {
    if (this.graph.has(node.id)) {
      this.updateNode(node);
      return;
    }
    const object = buildThreeObject(node);
    tagObjectWithNodeId(object, node.id);
    applyThreeTransform(object, node);
    const model = getModel3D(node);
    const entry = {
      object,
      parentId: node.parentId,
      kind: getLeafThreeComponent(node)?.type ?? "Container",
      assetId: model?.assetId,
      playback: snapshotModelPlayback(model),
      cameraActive: getPerspectiveCamera(node)?.active === true,
      runtimeVisible: getNodeVisible(node),
      editorHidden: false,
    };
    this.graph.set(node.id, entry);
    this.attachToParent(node.id, node.parentId);
    this.applyDisplayVisible(entry);
    this.syncNodeHelper(node.id);
    if (getPerspectiveCamera(node)) {
      this.syncViewCameraToTools();
    }
    void this.afterCreateAsync(node);
  }

  updateNode(node: SceneNodeData): void {
    const entry = this.graph.get(node.id);
    if (!entry) {
      this.createNode(node);
      return;
    }
    const nextKind = getLeafThreeComponent(node)?.type ?? "Container";
    const model = getModel3D(node);
    const nextAssetId = model?.assetId;
    if (entry.kind !== nextKind) {
      this.replaceObject(node, nextKind, nextAssetId);
      return;
    }
    // Playback pose is owned by `ctx.transform3D` (live Object3D handle), not
    // scene Transform3D. Re-applying the authored pose here snaps monsters
    // back to spawn on every clip change (idle → walk → attack).
    if (this.editable) {
      applyThreeTransform(entry.object, node);
    }
    applyThreeLightOrCameraProps(
      entry.object,
      node,
      this.resolveCameraAspect(),
    );
    entry.runtimeVisible = getNodeVisible(node);
    this.applyDisplayVisible(entry);
    if (nextKind === "PerspectiveCamera") {
      entry.cameraActive = getPerspectiveCamera(node)?.active === true;
      this.syncViewCameraToTools();
    }
    if (nextKind === "Model3D") {
      entry.playback = snapshotModelPlayback(model);
      if (entry.assetId !== nextAssetId) {
        entry.assetId = nextAssetId;
        void this.repaintModel(node.id);
      } else {
        syncModelAnimation(entry, this.gltfCache);
      }
    } else if (
      nextKind === "PerspectiveCamera" ||
      nextKind === "DirectionalLight" ||
      nextKind === "AmbientLight"
    ) {
      this.syncNodeHelper(node.id);
    }
    if (entry.parentId !== node.parentId) {
      this.reparentNode(node.id, node.parentId, 0);
    }
  }

  syncTransform(node: SceneNodeData): void {
    const entry = this.graph.get(node.id);
    if (!entry) {
      return;
    }
    applyThreeTransform(entry.object, node);
  }

  destroyNode(nodeId: string): void {
    if (!this.graph.has(nodeId)) {
      return;
    }
    const toDelete = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, entry] of this.graph.entries()) {
        if (
          entry.parentId !== undefined &&
          toDelete.has(entry.parentId) &&
          !toDelete.has(id)
        ) {
          toDelete.add(id);
          changed = true;
        }
      }
    }
    for (const id of toDelete) {
      const entry = this.graph.get(id);
      if (!entry) {
        continue;
      }
      disposeMixer(entry);
      this.nodeHelpers?.remove(id);
      entry.object.parent?.remove(entry.object);
      this.graph.delete(id);
    }
    this.syncViewCameraToTools();
  }

  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      throw new Error(`ThreeSceneRenderer: unknown node ${nodeId}`);
    }
    if (parentId !== undefined && !this.graph.has(parentId)) {
      throw new Error(`ThreeSceneRenderer: unknown parent ${parentId}`);
    }
    entry.parentId = parentId;
    this.attachToParent(nodeId, parentId);
    const parentObject = entry.object.parent;
    if (parentObject) {
      const kids = parentObject.children;
      const at = kids.indexOf(entry.object);
      if (at >= 0) {
        kids.splice(at, 1);
        kids.splice(Math.max(0, Math.min(index, kids.length)), 0, entry.object);
      }
    }
  }

  clear(): void {
    this.nodeHelpers?.clear();
    for (const [, entry] of this.graph.entries()) {
      disposeMixer(entry);
      entry.object.parent?.remove(entry.object);
    }
    this.graph.clear();
  }

  resize(width: number, height: number): void {
    // Layout can briefly report 0 during dock/window chrome changes; ignore
    // so we don't flash a 1×1 buffer.
    if (width < 1 || height < 1) {
      return;
    }
    const parent = this.canvasParent;
    if (this.designResolution && parent) {
      const measured = measurePlaybackParentSize(parent);
      if (measured.width < 1 || measured.height < 1) {
        return;
      }
      this.applyCanvasSize(measured.width, measured.height);
      return;
    }
    this.applyCanvasSize(width, height);
  }

  render(): void {
    if (!this.renderer || !this.editorCamera) {
      return;
    }
    const now = performance.now();
    const dt =
      this.playbackPaused || this.lastFrameMs === 0
        ? 0
        : Math.min(0.1, Math.max(0, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    updateMixers(this.graph.entries(), dt);
    this.nodeHelpers?.update();
    this.editorTools?.update();
    this.presentFrame();
  }

  getNodeCount(): number {
    return this.graph.size;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  setPlaybackPaused(paused: boolean): void {
    this.playbackPaused = paused;
    if (!paused) {
      this.lastFrameMs = performance.now();
    }
  }

  getRenderStats(): SceneRenderStats {
    return sampleThreeRenderStats(this.renderer, this.rootScene);
  }

  /** World pose of a named glTF bone (scripts / projectiles). */
  getBoneWorldTransform(nodeId: string, boneName: string) {
    const object = this.graph.get(nodeId)?.object;
    if (!object) {
      return undefined;
    }
    return readBoneWorldTransform(object, boneName);
  }

  /** Test/diagnostics: runtime parent link (not domain data). */
  getRuntimeParentId(nodeId: string): string | undefined {
    return this.graph.get(nodeId)?.parentId;
  }

  /** Test/diagnostics: viewport aspect applied to a PerspectiveCamera node. */
  getRuntimeCameraAspect(nodeId: string): number | undefined {
    const object = this.graph.get(nodeId)?.object;
    return object instanceof PerspectiveCamera ? object.aspect : undefined;
  }

  /** Test/diagnostics: design letterbox in top-left canvas pixels. */
  getRuntimeDesignView(): DesignLetterbox | undefined {
    return this.designView === undefined
      ? undefined
      : { ...this.designView };
  }

  private presentFrame(): void {
    if (!this.renderer || !this.editorCamera) {
      return;
    }
    const camera = this.resolveViewCamera();
    this.syncCameraAspect(camera);
    this.applyPlaybackViewport();
    this.renderer.render(this.rootScene, camera);
  }

  private scheduleHostResize(width: number, height: number): void {
    this.pendingResize = { width, height };
    if (this.resizeRafId !== 0) {
      return;
    }
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = 0;
      const pending = this.pendingResize;
      this.pendingResize = undefined;
      if (!pending || this.destroyed) {
        return;
      }
      this.resize(pending.width, pending.height);
    });
  }

  private resolveViewCamera(): PerspectiveCamera {
    return resolveActiveCamera({
      preferEditor: this.editable && this.viewMode === "editor",
      editorCamera: this.editorCamera,
      graph: this.graph,
    });
  }

  private syncCameraAspect(camera: PerspectiveCamera): void {
    const aspect = this.resolveCameraAspect();
    if (Math.abs(camera.aspect - aspect) < 1e-6) {
      return;
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  private resolveCameraAspect(): number {
    if (this.designResolution) {
      return designCameraAspect(this.designResolution);
    }
    return Math.max(this.width, 1) / Math.max(this.height, 1);
  }

  private refreshDesignView(): void {
    if (!this.designResolution || this.width < 1 || this.height < 1) {
      this.designView = undefined;
      return;
    }
    this.designView = computeDesignLetterbox(this.designResolution, {
      width: this.width,
      height: this.height,
    });
  }

  private applyCanvasSize(width: number, height: number): void {
    const nextWidth = Math.floor(width);
    const nextHeight = Math.floor(height);
    if (nextWidth === this.width && nextHeight === this.height) {
      this.refreshDesignView();
      this.syncAllCameraAspects();
      this.applyPlaybackCanvasCss();
      return;
    }
    this.width = nextWidth;
    this.height = nextHeight;
    this.refreshDesignView();
    this.syncAllCameraAspects();
    this.renderer?.setSize(this.width, this.height, false);
    this.applyPlaybackCanvasCss();
    // setSize clears the drawing buffer; paint immediately to avoid a blank flash
    // until the next rAF (especially with transparent hybrid mid-layer).
    this.presentFrame();
  }

  private applyPlaybackCanvasCss(): void {
    const canvas = this.renderer?.domElement;
    const parent = this.canvasParent;
    if (!canvas || !parent) {
      return;
    }
    applyPlaybackCanvasLayout(canvas, parent);
  }

  private applyPlaybackViewport(): void {
    const renderer = this.renderer;
    if (!renderer) {
      return;
    }
    const box = this.designView;
    if (!box) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, this.width, this.height);
      return;
    }
    const viewport = letterboxToThreeViewport(box, this.height);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, this.width, this.height);
    renderer.clear();
    renderer.setViewport(
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
    );
    renderer.setScissor(
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
    );
    renderer.setScissorTest(true);
  }

  private writePickNdc(
    clientX: number,
    clientY: number,
    rect: DOMRect,
  ): boolean {
    const box = this.designView;
    if (!box) {
      this.ndc.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      this.ndc.y =
        -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      return true;
    }
    const ndc = clientPointToLetterboxNdc(
      clientX,
      clientY,
      rect,
      box,
      { width: this.width, height: this.height },
    );
    if (!ndc) {
      return false;
    }
    this.ndc.x = ndc.x;
    this.ndc.y = ndc.y;
    return true;
  }

  private syncAllCameraAspects(): void {
    if (this.editorCamera) {
      this.syncCameraAspect(this.editorCamera);
    }
    for (const [, entry] of this.graph.entries()) {
      if (entry.object instanceof PerspectiveCamera) {
        this.syncCameraAspect(entry.object);
      }
    }
  }

  private syncViewCameraToTools(): void {
    if (!this.editorTools || !this.editorCamera) {
      return;
    }
    const camera = this.resolveViewCamera();
    this.editorTools.setViewCamera(camera);
    this.editorTools.setOrbitEnabled(this.viewMode === "editor");
  }

  private async initWebGl(
    parent: HTMLElement,
    background: number | undefined,
  ): Promise<void> {
    const transparent = this.backgroundAlpha < 1;
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: transparent,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (transparent) {
      renderer.setClearColor(
        background ?? DEFAULT_THREE_BACKGROUND,
        this.backgroundAlpha,
      );
    }
    const measured = measurePlaybackParentSize(parent);
    const width = Math.max(1, measured.width);
    const height = Math.max(1, measured.height);
    renderer.setSize(width, height, false);
    this.renderer = renderer;
    applyPlaybackCanvasLayout(renderer.domElement, parent);
    parent.appendChild(renderer.domElement);
    this.width = width;
    this.height = height;
    this.refreshDesignView();

    const camera = new PerspectiveCamera(
      EDITOR_CAMERA_FOV,
      this.resolveCameraAspect(),
      EDITOR_CAMERA_NEAR,
      EDITOR_CAMERA_FAR,
    );
    camera.position.set(
      EDITOR_CAMERA_POSITION.x,
      EDITOR_CAMERA_POSITION.y,
      EDITOR_CAMERA_POSITION.z,
    );
    this.editorCamera = camera;

    if (this.editable) {
      this.nodeHelpers = new ThreeEditorNodeHelpers(this.rootScene, true);
      this.editorTools = new ThreeEditorTools(
        camera,
        renderer,
        this.rootScene,
        this.graph,
        { getExtraPickRoots: () => this.nodeHelpers?.getPickRoots() ?? [] },
      );
      this.editorTools.setHandlers(this.pointerHandlers);
      this.editorTools.setSelectedNodeIds([...this.selectedNodeIds]);
      this.rootScene.add(new GridHelper(EDITOR_GRID_SIZE, EDITOR_GRID_DIVISIONS));
      this.syncViewCameraToTools();
    }

    if (!transparent) {
      this.rootScene.background = new Color(
        background ?? DEFAULT_THREE_BACKGROUND,
      );
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.destroyed) {
        return;
      }
      const measured = measurePlaybackParentSize(parent);
      this.scheduleHostResize(measured.width, measured.height);
    });
    this.resizeObserver.observe(parent);

    // Editor drives its own loop. Preview / game runtime call render() externally
    // (autoRender: false) so we must not double-RAF or Clock.getDelta() collapses.
    if (this.autoRender) {
      const tick = () => {
        if (this.destroyed) {
          return;
        }
        this.render();
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }
  }

  private attachToParent(
    nodeId: string,
    parentId: string | undefined,
  ): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    entry.object.parent?.remove(entry.object);
    // Hybrid scenes may parent a Three node under a Pixi-only id — fall back
    // to the Three world root so the object stays in the scene graph (required
    // by TransformControls).
    const parentObject =
      parentId !== undefined
        ? (this.graph.get(parentId)?.object ?? this.worldRoot)
        : this.worldRoot;
    parentObject.add(entry.object);
  }

  private replaceObject(
    node: SceneNodeData,
    kind: string,
    assetId: string | undefined,
  ): void {
    const entry = this.graph.get(node.id);
    if (!entry) {
      return;
    }
    disposeMixer(entry);
    const parent = entry.object.parent ?? this.worldRoot;
    entry.object.parent?.remove(entry.object);
    const next = buildThreeObject(node);
    tagObjectWithNodeId(next, node.id);
    applyThreeTransform(next, node);
    entry.object = next;
    entry.runtimeTransform?.retarget(next);
    entry.kind = kind;
    entry.assetId = assetId;
    entry.playback = snapshotModelPlayback(getModel3D(node));
    entry.cameraActive = getPerspectiveCamera(node)?.active === true;
    entry.runtimeVisible = getNodeVisible(node);
    parent.add(next);
    this.applyDisplayVisible(entry);
    this.editorTools?.refreshAttachment();
    this.syncNodeHelper(node.id);
    if (getPerspectiveCamera(node)) {
      this.syncViewCameraToTools();
    }
    void this.afterCreateAsync(node);
  }

  private syncNodeHelper(nodeId: string): void {
    const entry = this.graph.get(nodeId);
    if (!entry || !this.nodeHelpers) {
      return;
    }
    if (
      entry.kind === "PerspectiveCamera" ||
      entry.kind === "DirectionalLight" ||
      entry.kind === "AmbientLight"
    ) {
      this.nodeHelpers.sync(nodeId, entry.kind, entry.object);
      return;
    }
    this.nodeHelpers.remove(nodeId);
  }

  private async afterCreateAsync(node: SceneNodeData): Promise<void> {
    if (getModel3D(node)) {
      await this.repaintModel(node.id);
    }
  }

  private async repaintModel(nodeId: string): Promise<void> {
    const entry = this.graph.get(nodeId);
    if (!entry || entry.kind !== "Model3D") {
      return;
    }
    const assetId = entry.assetId;
    if (!assetId) {
      disposeMixer(entry);
      if (!isPlaceholderObject(entry.object)) {
        this.swapModelVisual(nodeId, createThreePlaceholder());
      }
      return;
    }
    const loaded = await this.gltfCache.ensureLoaded(assetId);
    if (this.destroyed || !this.graph.has(nodeId)) {
      return;
    }
    const current = this.graph.get(nodeId);
    if (!current || current.assetId !== assetId) {
      return;
    }
    if (!loaded) {
      disposeMixer(current);
      if (!isPlaceholderObject(current.object)) {
        this.swapModelVisual(nodeId, createThreePlaceholder());
      }
      return;
    }
    const instance = this.gltfCache.createInstance(assetId);
    if (!instance) {
      disposeMixer(current);
      if (!isPlaceholderObject(current.object)) {
        this.swapModelVisual(nodeId, createThreePlaceholder());
      }
      return;
    }
    disposeMixer(current);
    this.swapModelVisual(nodeId, instance);
    bindModelAnimation(current, this.gltfCache);
  }

  private swapModelVisual(nodeId: string, visual: Object3D): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    const parent = entry.object.parent ?? this.worldRoot;
    const position = entry.object.position.clone();
    const rotation = entry.object.rotation.clone();
    const scale = entry.object.scale.clone();
    // Detach gizmo before removing the live object from the graph.
    if (this.selectedNodeIds.has(nodeId)) {
      this.editorTools?.setSelectedNodeIds([]);
    }
    entry.object.parent?.remove(entry.object);
    visual.position.copy(position);
    visual.rotation.copy(rotation);
    visual.scale.copy(scale);
    tagObjectWithNodeId(visual, nodeId);
    entry.object = visual;
    entry.runtimeTransform?.retarget(visual);
    parent.add(visual);
    this.applyDisplayVisible(entry);
    if (this.selectedNodeIds.has(nodeId)) {
      this.editorTools?.setSelectedNodeIds([...this.selectedNodeIds]);
    }
  }
}
