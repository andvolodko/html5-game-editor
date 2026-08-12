import { Texture } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import {
  DEFAULT_SPRITE_SIZE,
  getTransform2D,
  getVisualAnchorOrDefault,
  getVisualComponent,
  getVisualDisplaySize,
  visualCenterFromAnchor,
  visualComponentSupportsAnchor,
  visualComponentSupportsDisplaySize,
} from "@game-editor/scene";
import { applyVisualDisplayLabel } from "./pixi-display-labels.js";
import { clearVisual, paintVisualComponent } from "./visuals/index.js";
import type { PixiRuntimeGraph, RuntimeNode } from "./pixi-runtime-nodes.js";
import type { PixiTextureCache } from "./pixi-texture-cache.js";
import {
  defaultVisualBounds,
  provisionalVisualBounds,
} from "./pixi-visual-bounds.js";
import { hitAreaFromBounds } from "./pixi-visual-hit-area.js";
import { viewportChromeInvScale } from "./viewport-camera.js";
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
}

/**
 * Paints node visuals and editor selection chrome for the Pixi runtime graph.
 */
export class PixiNodePainter {
  constructor(private readonly host: NodePainterHost) {}

  paint(runtime: RuntimeNode): void {
    this.host.graph.applyTransform(
      runtime.container,
      getTransform2D(runtime.node),
    );
    void this.paintVisuals(runtime);
    this.paintSelection(runtime);
  }

  async paintVisuals(runtime: RuntimeNode): Promise<void> {
    const visualData = getVisualComponent(runtime.node);
    runtime.placeholder?.clear();
    // Never put hitArea on the node container — it would prune child sprites
    // whose local positions fall outside the parent's visual rect.
    runtime.container.hitArea = undefined;

    if (!visualData) {
      clearVisual(runtime.visual);
      runtime.visual = undefined;
      runtime.visualType = undefined;
      runtime.visualBounds = undefined;
      runtime.supportsSpriteGizmo = false;
      if (runtime.placeholder) {
        runtime.placeholder.visible = false;
      }
      this.clearVisualsHitArea(runtime);
      this.paintSelection(runtime);
      return;
    }

    // Apply live size / anchor previews for selection-gizmo drags.
    let data = visualData;
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
          ...visualData,
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

    if (!this.host.graph.has(runtime.node.id)) {
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
    this.setVisualsHitArea(runtime, bounds);
    // Selection/gizmo depend on final bounds; paintSelection often runs before
    // this async paint resolves, so refresh once metrics are authoritative.
    this.paintSelection(runtime);
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
    const cameraScale = this.host.getCameraScale();
    const inv = viewportChromeInvScale(cameraScale);
    selection.clear();
    if (!selected) {
      runtime.gizmo?.setVisible(false);
      return;
    }

    // Full selection gizmo (rotate / flip / optional size+anchor) for every
    // Pixi leaf visual with known bounds — not Sprite-only.
    if (visual && runtime.gizmo && runtime.visualBounds) {
      const displaySize = getVisualDisplaySize(visual);
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
      const supportsAnchor = visualComponentSupportsAnchor(visual);
      const anchor =
        runtime.anchorPreview ?? getVisualAnchorOrDefault(visual);
      // Anchor-based visuals: derive center from size+anchor (preview-safe).
      // Others: use live AABB center so mesh/graphics chrome stays aligned.
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
        cameraScale,
        {
          size: visualComponentSupportsDisplaySize(visual),
          scale: !visualComponentSupportsDisplaySize(visual),
          anchor: supportsAnchor,
        },
      );
      return;
    }

    runtime.gizmo?.setVisible(false);
    if (runtime.visualBounds) {
      const { x, y, width, height } = runtime.visualBounds;
      selection.rect(x, y, width, height);
      selection.stroke({
        color: EDITOR_ACCENT_COLOR,
        width: EDITOR_SELECTION_STROKE_WIDTH * inv,
      });
      return;
    }
    // Grouping nodes have no default bounds graphic — mark origin only.
    selection.circle(0, 0, EDITOR_GROUP_ORIGIN_MARKER_RADIUS * inv);
    selection.fill({
      color: EDITOR_CHROME_FILL,
      alpha: EDITOR_SELECTION_FILL_ALPHA,
    });
    selection.stroke({
      color: EDITOR_ACCENT_COLOR,
      width: EDITOR_SELECTION_STROKE_WIDTH * inv,
    });
  }

  invalidateStaleTextures(): void {
    this.host.textureCache.evictStale((assetId) =>
      this.host.getAssetResolver()?.resolveUrl(assetId),
    );
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
    runtime.visualsRoot.hitArea = hitAreaFromBounds(
      bounds,
      this.host.getCameraScale(),
    );
  }

  private clearVisualsHitArea(runtime: RuntimeNode): void {
    if (runtime.visualsRoot === runtime.container) {
      return;
    }
    runtime.visualsRoot.hitArea = undefined;
  }

  private async loadTexture(assetId: string, url: string): Promise<Texture> {
    const format =
      this.host.getAssetResolver()?.resolveTextureFormat?.(assetId) ?? "png";
    return this.host.textureCache.load(assetId, url, format);
  }
}
