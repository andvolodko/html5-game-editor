import type { AssetResolver } from "@game-editor/assets";
import type { Vec3 } from "@game-editor/scene";
import type { ThreeGltfCache } from "./three-gltf-cache.js";

export interface ThreeSceneRendererOptions {
  canvasParent?: HTMLElement;
  background?: number;
  /** 0–1 clear alpha. Use 0 for hybrid middle layer so Pixi-under shows through. */
  backgroundAlpha?: number;
  assetResolver?: AssetResolver;
  /**
   * Skip WebGL init (graph ops only). Intended for unit tests.
   */
  headless?: boolean;
  /**
   * When false, omit orbit controls, transform gizmos, and selection helpers.
   * Use for game runtime / preview.
   */
  editable?: boolean;
  /**
   * When false, do not start an internal RAF loop — host must call render().
   * Defaults to `editable` (editor self-drives; preview/hybrid hosts drive).
   */
  autoRender?: boolean;
  /** Called when a glTF asset fails to load (after placeholder fallback). */
  onGltfLoadError?: (assetId: string, error: unknown) => void;
  /**
   * Optional shared glTF cache (game boot / preview preload).
   * When omitted, the renderer owns a private cache cleared on destroy.
   */
  gltfCache?: ThreeGltfCache;
}

export interface ThreeGizmoDragEnd {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface ThreePointerHandlers {
  onBackgroundPointerDown?: () => void;
  onNodePointerDown?: (nodeId: string) => void;
  /** Fired once when a TransformControls drag ends. */
  onGizmoTransformEnd?: (nodeId: string, transform: ThreeGizmoDragEnd) => void;
}
