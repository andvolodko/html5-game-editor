import type { AssetResolver } from "@game-editor/assets";
import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import {
  ThreeSceneRenderer,
  type ThreeGltfCache,
} from "@game-editor/renderer-three";
import {
  MultiSceneRenderer,
  nodeBelongsToPixiBackground,
  nodeBelongsToPixiForeground,
  nodeBelongsToThree,
  type SceneRenderer,
} from "@game-editor/scene";
import {
  applyHybridPreviewInput,
  DEFAULT_HYBRID_LAYER_VISIBILITY,
  pickVisibleHybridNodeId,
  syncHybridEditorChrome,
  type HybridInputLayer,
  type HybridLayerVisibility,
} from "./hybrid-layer-visibility.js";

export type { HybridInputLayer, HybridLayerVisibility };
export {
  applyHybridInputLayer,
  applyHybridLayerVisibility,
  applyHybridPreviewInput,
  DEFAULT_HYBRID_LAYER_VISIBILITY,
} from "./hybrid-layer-visibility.js";

export interface HybridCanvasHosts {
  stack: HTMLElement;
  bgHost: HTMLElement;
  midHost: HTMLElement;
  fgHost: HTMLElement;
  inputHost: HTMLElement;
}

export interface HybridRendererStack {
  hosts: HybridCanvasHosts;
  pixiBackground: PixiSceneRenderer;
  three: ThreeSceneRenderer;
  pixiForeground: PixiSceneRenderer;
  documentRenderer: SceneRenderer;
  layerVisibility: HybridLayerVisibility;
  setHybridInputLayer(layer: HybridInputLayer): void;
  setHybridLayerVisibility(visibility: HybridLayerVisibility): void;
  /** Editor: selection-driven. Preview: leave all canvases none; use inputHost. */
  mode: "editor" | "preview";
  destroy(): Promise<void>;
  startExternalThreeLoop(): () => void;
}

function createLayerHost(parent: HTMLElement, className: string): HTMLElement {
  const layer = document.createElement("div");
  layer.className = className;
  parent.appendChild(layer);
  return layer;
}

export function createHybridCanvasHosts(host: HTMLElement): HybridCanvasHosts {
  host.replaceChildren();
  const stack = createLayerHost(host, "scene-viewport-stack");
  const bgHost = createLayerHost(stack, "scene-viewport-layer scene-viewport-bg");
  const midHost = createLayerHost(
    stack,
    "scene-viewport-layer scene-viewport-mid",
  );
  const fgHost = createLayerHost(stack, "scene-viewport-layer scene-viewport-fg");
  const inputHost = createLayerHost(
    stack,
    "scene-viewport-layer scene-viewport-input",
  );
  stack.style.position = "absolute";
  stack.style.inset = "0";
  for (const el of [bgHost, midHost, fgHost, inputHost]) {
    el.style.position = "absolute";
    el.style.inset = "0";
  }
  return { stack, bgHost, midHost, fgHost, inputHost };
}

export async function createHybridRendererStack(options: {
  host: HTMLElement;
  assetResolver: AssetResolver;
  background?: number;
  mode: "editor" | "preview";
  designResolution?: { width: number; height: number };
  pixiBackgroundColor?: number;
  pixiBackgroundAlpha?: number;
  gltfCache?: ThreeGltfCache;
}): Promise<HybridRendererStack> {
  const hosts = createHybridCanvasHosts(options.host);
  const editable = options.mode === "editor";

  const pixiBackground = new PixiSceneRenderer({
    canvasParent: hosts.bgHost,
    assetResolver: options.assetResolver,
    editable,
    pixelGrid: editable,
    screenGuides: editable,
    ...(options.designResolution
      ? { designResolution: options.designResolution }
      : {}),
    ...(options.pixiBackgroundColor !== undefined
      ? { background: options.pixiBackgroundColor }
      : options.background !== undefined
        ? { background: options.background }
        : {}),
    ...(options.pixiBackgroundAlpha !== undefined
      ? { backgroundAlpha: options.pixiBackgroundAlpha }
      : {}),
  });
  const three = new ThreeSceneRenderer({
    canvasParent: hosts.midHost,
    assetResolver: options.assetResolver,
    backgroundAlpha: 0,
    editable,
    // Host drives Three frames (shared with preview GameRuntime / editor loop).
    autoRender: false,
    ...(options.gltfCache ? { gltfCache: options.gltfCache } : {}),
    ...(options.mode === "preview" && options.designResolution
      ? { designResolution: options.designResolution }
      : {}),
  });
  const pixiForeground = new PixiSceneRenderer({
    canvasParent: hosts.fgHost,
    assetResolver: options.assetResolver,
    editable,
    backgroundAlpha: 0,
    pixelGrid: false,
    screenGuides: false,
    ...(options.designResolution
      ? { designResolution: options.designResolution }
      : {}),
  });

  await Promise.all([
    pixiBackground.whenReady(),
    three.whenReady(),
    pixiForeground.whenReady(),
  ]);

  const unsubBg = pixiBackground.subscribeViewportCamera((state) => {
    pixiForeground.applyViewportCamera(state);
  });
  const unsubFg = pixiForeground.subscribeViewportCamera((state) => {
    pixiBackground.applyViewportCamera(state);
  });

  let inputLayer: HybridInputLayer = "three";
  const stack: HybridRendererStack = {
    hosts,
    pixiBackground,
    three,
    pixiForeground,
    documentRenderer: new MultiSceneRenderer([
      { renderer: pixiBackground, accepts: nodeBelongsToPixiBackground },
      { renderer: three, accepts: nodeBelongsToThree },
      { renderer: pixiForeground, accepts: nodeBelongsToPixiForeground },
    ]),
    layerVisibility: { ...DEFAULT_HYBRID_LAYER_VISIBILITY },
    mode: options.mode,
    setHybridInputLayer: (layer) => {
      if (options.mode !== "editor") {
        return;
      }
      inputLayer = layer;
      syncHybridEditorChrome(hosts, inputLayer, stack.layerVisibility);
    },
    setHybridLayerVisibility: (visibility) => {
      stack.layerVisibility = { pixi: visibility.pixi, three: visibility.three };
      if (options.mode !== "editor") {
        return;
      }
      syncHybridEditorChrome(hosts, inputLayer, stack.layerVisibility);
    },
    startExternalThreeLoop: () => {
      let raf = 0;
      let alive = true;
      const tick = () => {
        if (!alive) {
          return;
        }
        three.render();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        alive = false;
        cancelAnimationFrame(raf);
      };
    },
    destroy: async () => {
      unsubBg();
      unsubFg();
      await Promise.all([
        pixiBackground.destroy(),
        three.destroy(),
        pixiForeground.destroy(),
      ]);
      options.host.replaceChildren();
    },
  };

  if (options.mode === "editor") {
    syncHybridEditorChrome(hosts, inputLayer, stack.layerVisibility);
  } else {
    applyHybridPreviewInput(hosts);
  }

  return stack;
}

/**
 * Cascaded pick for hybrid preview: FG Pixi → Three → BG Pixi.
 */
export function pickHybridNodeId(
  stack: Pick<
    HybridRendererStack,
    "pixiForeground" | "three" | "pixiBackground" | "layerVisibility"
  >,
  clientX: number,
  clientY: number,
): string | undefined {
  return pickVisibleHybridNodeId(stack.layerVisibility, {
    pickForeground: () => stack.pixiForeground.pickNodeId(clientX, clientY),
    pickThree: () => stack.three.pickNodeId(clientX, clientY),
    pickBackground: () => stack.pixiBackground.pickNodeId(clientX, clientY),
  });
}
