import { Texture } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import {
  DEFAULT_SPRITE_SIZE,
  DEFAULT_VISUAL_ANCHOR,
  getTransform2D,
  getVisualAnchorOrDefault,
  getVisualComponent,
  getVisualDisplaySize,
  getHitZoneOffset,
  getMaskOffset,
  hitZoneShapeSize,
  maskAsHitZone,
  visualCenterFromAnchor,
  visualComponentSupportsAnchor,
  visualComponentSupportsDisplaySize,
} from "@game-editor/scene";
import { applyPixiNodeContentAlpha } from "./pixi-node-alpha.js";
import { computeGroupingContentBounds } from "./pixi-content-bounds.js";
import { applyVisualDisplayLabel } from "./pixi-display-labels.js";
import { chromeHitBounds, effectiveHitZone } from "./pixi-hit-zone-pick.js";
import { syncHitZoneDisplay } from "./pixi-hit-zone-sync.js";
import { applyPlaybackPointerEventMode } from "./pixi-node-pointer.js";
import { effectiveMask } from "./pixi-mask-pick.js";
import { sceneGraphicsPolygon } from "./pixi-graphics-polygon-drag.js";
import { syncMaskDisplay } from "./pixi-mask-sync.js";
import { clearVisual, paintVisualComponent } from "./visuals/index.js";
import type { PixiRuntimeGraph, RuntimeNode } from "./pixi-runtime-nodes.js";
import type { PixiTextureCache } from "./pixi-texture-cache.js";
import {
  defaultVisualBounds,
  provisionalVisualBounds,
} from "./pixi-visual-bounds.js";
import { localScaleTowardAncestor } from "./pixi-chrome-scale.js";
import { hitAreaFromBounds } from "./pixi-visual-hit-area.js";
import { viewportChromeInvScaleAxes } from "./viewport-camera.js";
import {
  EDITOR_ACCENT_COLOR,
  EDITOR_CHROME_FILL,
  EDITOR_GROUP_ORIGIN_MARKER_RADIUS,
  EDITOR_SELECTION_FILL_ALPHA,
  EDITOR_SELECTION_STROKE_WIDTH,
} from "./editor-chrome.js";

export interface NodePainterHost {
  readonly editable: boolean;
  readonly graph: PixiRuntimeGraph;
  readonly textureCache: PixiTextureCache;
  getSelectedNodeIds(): ReadonlySet<string>;
  getCameraScale(): number;
  getAssetResolver(): AssetResolver | undefined;
  onPlaybackHitTargetReady?(runtime: RuntimeNode): void;
}

/**
 * Paints node visuals and editor selection chrome for the Pixi runtime graph.
 */
export class PixiNodePainter {
  private readonly paintEpoch = new WeakMap<RuntimeNode, number>();
  private readonly paintInFlight = new WeakMap<RuntimeNode, boolean>();

  constructor(private readonly host: NodePainterHost) {}

  paint(
    runtime: RuntimeNode,
    options?: { applyTransform?: boolean },
  ): void {
    if (options?.applyTransform !== false) {
      this.host.graph.applyTransform(
        runtime.container,
        getTransform2D(runtime.node),
      );
    }
    void this.paintVisuals(runtime);
    this.paintSelection(runtime);
  }

  /**
   * Coalesce overlapping paints. `createNode` + immediate `updateNode`
   * (Load All Scene Assets `setText` in the script constructor) used to start
   * two paints while `runtime.visual` was still unset, so Text duplicated.
   */
  async paintVisuals(runtime: RuntimeNode): Promise<void> {
    const nextEpoch = (this.paintEpoch.get(runtime) ?? 0) + 1;
    this.paintEpoch.set(runtime, nextEpoch);
    if (this.paintInFlight.get(runtime) === true) {
      return;
    }
    this.paintInFlight.set(runtime, true);
    try {
      while (this.isLiveRuntime(runtime)) {
        const started = this.paintEpoch.get(runtime) ?? 0;
        await this.paintVisualsPass(runtime);
        if ((this.paintEpoch.get(runtime) ?? 0) === started) {
          break;
        }
      }
    } finally {
      this.paintInFlight.set(runtime, false);
    }
  }

  private async paintVisualsPass(runtime: RuntimeNode): Promise<void> {
    const visualData = getVisualComponent(runtime.node);
    runtime.placeholder?.clear();
    // Never put hitArea on the node container — it would prune child sprites
    // whose local positions fall outside the parent's visual rect.
    runtime.container.hitArea = undefined;

    if (!visualData) {
      clearVisual(runtime.visual, runtime.visualsRoot);
      runtime.visual = undefined;
      runtime.visualType = undefined;
      runtime.supportsSpriteGizmo = false;
      if (runtime.placeholder) {
        runtime.placeholder.visible = false;
      }
      this.applyGroupingContentBounds(runtime);
      this.finishVisualPaint(runtime);
      return;
    }

    // Apply live size / anchor / Graphics-polygon previews for gizmo drags.
    let data = visualData;
    if (runtime.graphicsShapePreview && visualData.type === "Graphics") {
      data = {
        ...visualData,
        shape: runtime.graphicsShapePreview,
      };
    }
    if (runtime.sizePreview || runtime.anchorPreview) {
      const sizePatch =
        runtime.sizePreview && visualComponentSupportsDisplaySize(visualData)
          ? {
              width: runtime.sizePreview.width,
              height: runtime.sizePreview.height,
            }
          : {};
      const anchorPatch =
        runtime.anchorPreview && visualComponentSupportsAnchor(visualData)
          ? { anchor: { ...runtime.anchorPreview } }
          : {};
      if (
        Object.keys(sizePatch).length > 0 ||
        Object.keys(anchorPatch).length > 0
      ) {
        data = {
          ...data,
          ...sizePatch,
          ...anchorPatch,
        };
      }
    }

    const provisional = provisionalVisualBounds(data);
    if (provisional) {
      this.setVisualsHitArea(runtime, provisional);
    }

    const assetResolver = this.host.getAssetResolver();
    const result = await paintVisualComponent({
      node: runtime.node,
      data,
      visualsRoot: runtime.visualsRoot,
      visual: runtime.visual,
      visualType: runtime.visualType,
      textures: {
        loadTexture: (assetId, url) => this.loadTexture(assetId, url),
        resolveUrl: (assetId) => assetResolver?.resolveUrl(assetId),
        whiteTexture: () => Texture.WHITE,
      },
      assetResolver,
      showPlaceholder: (width, height, tint) => {
        this.host.graph.showPlaceholder(runtime, width, height, tint);
      },
      hidePlaceholder: () => {
        if (runtime.placeholder) {
          runtime.placeholder.visible = false;
        }
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

    if (!this.isLiveRuntime(runtime)) {
      return;
    }

    runtime.visual = result.visual;
    runtime.visualType = result.visualType;
    runtime.visualBounds = result.bounds;
    runtime.supportsSpriteGizmo = result.supportsSpriteGizmo === true;
    if (result.visual) {
      runtime.warnedMissingAsset = false;
      applyVisualDisplayLabel(
        result.visual,
        runtime.node.name,
        result.visualType,
        !runtime.editable,
      );
    }

    const bounds =
      result.bounds ??
      provisional ??
      defaultVisualBounds(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE);
    this.setVisualsHitArea(
      runtime,
      chromeHitBounds(runtime, bounds) ?? bounds,
    );
    // Selection/gizmo depend on final bounds; paintSelection often runs before
    // this async paint resolves, so refresh once metrics are authoritative.
    this.finishVisualPaint(runtime);
  }

  private finishVisualPaint(runtime: RuntimeNode): void {
    applyPixiNodeContentAlpha(runtime);
    this.paintSelection(runtime);
    this.refreshGroupingAncestors(runtime);
    this.syncPlaybackHitZone(runtime);
    void this.syncMask(runtime);
  }

  paintSelection(runtime: RuntimeNode): void {
    if (!this.host.editable) {
      return;
    }
    const selection = runtime.selection;
    if (!selection) {
      return;
    }
    const selected = this.host.getSelectedNodeIds().has(runtime.node.id);
    const visual = getVisualComponent(runtime.node);
    if (!visual) {
      this.applyGroupingContentBounds(runtime);
    }
    const cameraScale = this.host.getCameraScale();
    const nodeScale = localScaleTowardAncestor(
      runtime.container,
      this.host.graph.world,
    );
    const inv = viewportChromeInvScaleAxes(
      cameraScale,
      nodeScale.x,
      nodeScale.y,
    );
    const invStroke = Math.min(inv.x, inv.y);
    this.syncHitZone(runtime, selected, invStroke);
    void this.syncMask(runtime);
    selection.clear();
    if (!selected) {
      runtime.gizmo?.setVisible(false);
      runtime.hitZoneGizmo?.setVisible(false);
      runtime.maskGizmo?.setVisible(false);
      runtime.graphicsPolygonGizmo?.setVisible(false);
      return;
    }

    // Full selection gizmo for leaf visuals and grouping nodes with content
    // bounds (scale/rotate around Transform2D; size/anchor only on leaves).
    if (runtime.gizmo && runtime.visualBounds && !runtime.editorLocked) {
      const displaySize = visual ? getVisualDisplaySize(visual) : undefined;
      const width =
        runtime.sizePreview?.width ??
        runtime.visualBounds.width ??
        displaySize?.width ??
        DEFAULT_SPRITE_SIZE;
      const height =
        runtime.sizePreview?.height ??
        runtime.visualBounds.height ??
        displaySize?.height ??
        DEFAULT_SPRITE_SIZE;
      const transform = getTransform2D(runtime.node);
      const flipX = (transform?.scale.x ?? 1) < 0;
      const flipY = (transform?.scale.y ?? 1) < 0;
      const supportsAnchor = visual
        ? visualComponentSupportsAnchor(visual)
        : false;
      const supportsSize = visual
        ? visualComponentSupportsDisplaySize(visual)
        : false;
      const anchor =
        runtime.anchorPreview ??
        (visual ? getVisualAnchorOrDefault(visual) : DEFAULT_VISUAL_ANCHOR);
      // Anchor-based visuals: derive center from size+anchor (preview-safe).
      // Others (meshes, grouping AABB): live bounds center.
      const center = supportsAnchor
        ? visualCenterFromAnchor(anchor, width, height)
        : {
            x: runtime.visualBounds.x + runtime.visualBounds.width / 2,
            y: runtime.visualBounds.y + runtime.visualBounds.height / 2,
          };
      runtime.gizmo.root.position.set(center.x, center.y);
      runtime.gizmo.setVisible(true);
      runtime.gizmo.layout(
        width,
        height,
        { anchor, flipX, flipY },
        {
          x: cameraScale * nodeScale.x,
          y: cameraScale * nodeScale.y,
        },
        {
          size: supportsSize,
          scale: !supportsSize,
          anchor: supportsAnchor,
        },
      );
      this.layoutHitZoneGizmo(runtime, cameraScale, nodeScale);
      this.layoutMaskGizmo(runtime, cameraScale, nodeScale);
      this.layoutGraphicsPolygonGizmo(runtime, cameraScale, nodeScale);
      return;
    }

    runtime.gizmo?.setVisible(false);
    if (runtime.visualBounds) {
      const { x, y, width, height } = runtime.visualBounds;
      selection.rect(x, y, width, height);
      selection.stroke({
        color: EDITOR_ACCENT_COLOR,
        width: EDITOR_SELECTION_STROKE_WIDTH * invStroke,
      });
      this.layoutHitZoneGizmo(runtime, cameraScale, nodeScale);
      this.layoutMaskGizmo(runtime, cameraScale, nodeScale);
      this.layoutGraphicsPolygonGizmo(runtime, cameraScale, nodeScale);
      return;
    }
    // Empty grouping nodes have no content AABB — mark origin only.
    selection.circle(0, 0, EDITOR_GROUP_ORIGIN_MARKER_RADIUS * invStroke);
    selection.fill({
      color: EDITOR_CHROME_FILL,
      alpha: EDITOR_SELECTION_FILL_ALPHA,
    });
    selection.stroke({
      color: EDITOR_ACCENT_COLOR,
      width: EDITOR_SELECTION_STROKE_WIDTH * invStroke,
    });
    this.layoutHitZoneGizmo(runtime, cameraScale, nodeScale);
    this.layoutMaskGizmo(runtime, cameraScale, nodeScale);
    this.layoutGraphicsPolygonGizmo(runtime, cameraScale, nodeScale);
  }

  private layoutHitZoneGizmo(
    runtime: RuntimeNode,
    cameraScale: number,
    nodeScale: { x: number; y: number },
  ): void {
    const gizmo = runtime.hitZoneGizmo;
    if (!gizmo) {
      return;
    }
    const hitZone = effectiveHitZone(runtime);
    if (!hitZone || runtime.editorLocked) {
      gizmo.setVisible(false);
      return;
    }
    const offset = getHitZoneOffset(hitZone);
    const transform = getTransform2D(runtime.node);
    const chromeScale = {
      x: cameraScale * nodeScale.x,
      y: cameraScale * nodeScale.y,
    };
    gizmo.root.position.set(offset.x, offset.y);
    gizmo.setVisible(true);
    if (hitZone.shape.type === "polygon") {
      gizmo.layoutPolygon(hitZone.shape.points, chromeScale);
      return;
    }
    const size = hitZoneShapeSize(hitZone.shape);
    if (!size) {
      gizmo.setVisible(false);
      return;
    }
    gizmo.layout(
      size.width,
      size.height,
      chromeScale,
      transform?.rotation ?? 0,
      {
        x: (transform?.scale.x ?? 1) < 0,
        y: (transform?.scale.y ?? 1) < 0,
      },
    );
  }

  private layoutMaskGizmo(
    runtime: RuntimeNode,
    cameraScale: number,
    nodeScale: { x: number; y: number },
  ): void {
    const gizmo = runtime.maskGizmo;
    if (!gizmo) {
      return;
    }
    const mask = effectiveMask(runtime);
    const zone = mask ? maskAsHitZone(mask) : undefined;
    if (!mask || !zone || runtime.editorLocked) {
      gizmo.setVisible(false);
      return;
    }
    const offset = getMaskOffset(mask);
    const transform = getTransform2D(runtime.node);
    const chromeScale = {
      x: cameraScale * nodeScale.x,
      y: cameraScale * nodeScale.y,
    };
    gizmo.root.position.set(offset.x, offset.y);
    gizmo.setVisible(true);
    if (mask.mode === "shape" && zone.shape.type === "polygon") {
      gizmo.layoutPolygon(zone.shape.points, chromeScale);
      return;
    }
    const size = hitZoneShapeSize(zone.shape);
    if (!size) {
      gizmo.setVisible(false);
      return;
    }
    gizmo.layout(
      size.width,
      size.height,
      chromeScale,
      transform?.rotation ?? 0,
      {
        x: (transform?.scale.x ?? 1) < 0,
        y: (transform?.scale.y ?? 1) < 0,
      },
    );
  }

  private layoutGraphicsPolygonGizmo(
    runtime: RuntimeNode,
    cameraScale: number,
    nodeScale: { x: number; y: number },
  ): void {
    const gizmo = runtime.graphicsPolygonGizmo;
    if (!gizmo) {
      return;
    }
    const shape = sceneGraphicsPolygon(runtime);
    if (!shape || runtime.editorLocked) {
      gizmo.setVisible(false);
      return;
    }
    gizmo.root.position.set(0, 0);
    gizmo.setVisible(true);
    gizmo.layoutPolygon(shape.points, {
      x: cameraScale * nodeScale.x,
      y: cameraScale * nodeScale.y,
    });
  }

  invalidateStaleTextures(): void {
    this.host.textureCache.evictStale((assetId) =>
      this.host.getAssetResolver()?.resolveUrl(assetId),
    );
  }

  refreshChromeHitArea(runtime: RuntimeNode): void {
    const bounds = chromeHitBounds(runtime, runtime.visualBounds);
    if (bounds) {
      this.setVisualsHitArea(runtime, bounds);
    } else {
      this.clearVisualsHitArea(runtime);
    }
  }

  /** Recompute a grouping node's content AABB and ancestor grouping bounds. */
  refreshGroupingNode(nodeId: string): void {
    const runtime = this.host.graph.get(nodeId);
    if (!runtime) {
      return;
    }
    this.applyGroupingContentBounds(runtime);
    if (this.host.getSelectedNodeIds().has(runtime.node.id)) {
      this.paintSelection(runtime);
    }
    this.refreshGroupingAncestors(runtime);
  }

  /**
   * Editor chrome owns a dedicated visualsRoot that can safely hold hitArea.
   * Playback aliases visualsRoot to the node container — never put hitArea there.
   */
  private setVisualsHitArea(
    runtime: RuntimeNode,
    bounds: { x: number; y: number; width: number; height: number },
  ): void {
    if (runtime.visualsRoot === runtime.container) {
      return;
    }
    if (runtime.container.destroyed || runtime.visualsRoot.destroyed) {
      return;
    }
    runtime.visualsRoot.hitArea = hitAreaFromBounds(
      bounds,
      this.host.getCameraScale(),
      localScaleTowardAncestor(runtime.container, this.host.graph.world),
    );
  }

  private clearVisualsHitArea(runtime: RuntimeNode): void {
    if (runtime.visualsRoot === runtime.container) {
      return;
    }
    runtime.visualsRoot.hitArea = undefined;
  }

  private applyGroupingContentBounds(runtime: RuntimeNode): void {
    if (getVisualComponent(runtime.node)) {
      return;
    }
    const childBounds = computeGroupingContentBounds(runtime, this.host.graph);
    const bounds = chromeHitBounds(runtime, childBounds);
    runtime.visualBounds = bounds;
    if (bounds) {
      this.setVisualsHitArea(runtime, bounds);
    } else {
      this.clearVisualsHitArea(runtime);
    }
  }

  private syncHitZone(
    runtime: RuntimeNode,
    selected: boolean,
    strokeScale: number,
  ): void {
    syncHitZoneDisplay(runtime, { selected, strokeScale });
  }

  private syncPlaybackHitZone(runtime: RuntimeNode): void {
    if (runtime.editable) {
      return;
    }
    syncHitZoneDisplay(runtime, { selected: false, strokeScale: 1 });
    this.host.onPlaybackHitTargetReady?.(runtime);
    applyPlaybackPointerEventMode(runtime);
  }

  private async syncMask(runtime: RuntimeNode): Promise<void> {
    const selected = this.host.getSelectedNodeIds().has(runtime.node.id);
    const cameraScale = this.host.getCameraScale();
    const nodeScale = localScaleTowardAncestor(
      runtime.container,
      this.host.graph.world,
    );
    const inv = viewportChromeInvScaleAxes(
      cameraScale,
      nodeScale.x,
      nodeScale.y,
    );
    const assetResolver = this.host.getAssetResolver();
    await syncMaskDisplay(runtime, {
      selected,
      strokeScale: Math.min(inv.x, inv.y),
      textures: {
        loadTexture: (assetId, url) => this.loadTexture(assetId, url),
        resolveUrl: (assetId) => assetResolver?.resolveUrl(assetId),
        warnMissingAsset: (assetId) => {
          if (!runtime.warnedMissingMaskAsset) {
            runtime.warnedMissingMaskAsset = true;
            console.warn("[renderer] missing asset", {
              category: "renderer",
              assetId,
              nodeId: runtime.node.id,
            });
          }
        },
      },
    });
  }

  private refreshGroupingAncestors(runtime: RuntimeNode): void {
    let parentId = runtime.node.parentId;
    while (parentId) {
      const parent = this.host.graph.get(parentId);
      if (!parent) {
        break;
      }
      this.applyGroupingContentBounds(parent);
      if (this.host.getSelectedNodeIds().has(parent.node.id)) {
        this.paintSelection(parent);
      }
      parentId = parent.node.parentId;
    }
  }

  /** Same node id can be recreated while an async paint is in flight. */
  private isLiveRuntime(runtime: RuntimeNode): boolean {
    return this.host.graph.get(runtime.node.id) === runtime;
  }

  private async loadTexture(assetId: string, url: string): Promise<Texture> {
    const format =
      this.host.getAssetResolver()?.resolveTextureFormat?.(assetId) ?? "png";
    return this.host.textureCache.load(assetId, url, format);
  }
}
