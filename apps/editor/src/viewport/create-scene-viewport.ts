import type { AssetResolver } from "@game-editor/assets";
import {
  PixiSceneRenderer,
} from "@game-editor/renderer-pixi";
import {
  ThreeSceneRenderer,
} from "@game-editor/renderer-three";
import {
  type SceneRenderer,
  type SceneRendererKind,
} from "@game-editor/scene";
import {
  createHybridRendererStack,
  type HybridInputLayer,
  type HybridRendererStack,
} from "./hybrid-stack.js";

export type { HybridInputLayer };
export type ThreeTransformMode = "translate" | "rotate" | "scale";
export type ThreeViewMode = "editor" | "camera";

export interface SceneViewportHandle {
  kind: SceneRendererKind;
  documentRenderer: SceneRenderer;
  pixi?: PixiSceneRenderer;
  pixiBackground?: PixiSceneRenderer;
  pixiForeground?: PixiSceneRenderer;
  three?: ThreeSceneRenderer;
  whenReady(): Promise<void>;
  destroy(): Promise<void>;
  setAssetResolver(resolver: AssetResolver): void;
  setSelectedNodeIds(ids: readonly string[]): void;
  setHybridInputLayer?(layer: HybridInputLayer): void;
  setThreeTransformMode?(mode: ThreeTransformMode): void;
  getThreeTransformMode?(): ThreeTransformMode;
  setThreeViewMode?(mode: ThreeViewMode): void;
  getThreeViewMode?(): ThreeViewMode;
  clientToWorld(clientX: number, clientY: number): { x: number; y: number };
}

export async function createSceneViewport(options: {
  host: HTMLElement;
  kind: SceneRendererKind;
  assetResolver: AssetResolver;
  background?: number;
}): Promise<SceneViewportHandle> {
  const { host, kind, assetResolver, background } = options;
  host.replaceChildren();

  if (kind === "pixi") {
    const pixi = new PixiSceneRenderer({
      canvasParent: host,
      assetResolver,
      pixelGrid: true,
      screenGuides: true,
      ...(background !== undefined ? { background } : {}),
    });
    await pixi.whenReady();
    return {
      kind,
      documentRenderer: pixi,
      pixi,
      whenReady: () => pixi.whenReady(),
      destroy: () => pixi.destroy(),
      setAssetResolver: (resolver) => pixi.setAssetResolver(resolver),
      setSelectedNodeIds: (ids) => pixi.setSelectedNodeIds(ids),
      clientToWorld: (x, y) => pixi.clientToWorld(x, y),
    };
  }

  if (kind === "three") {
    const three = new ThreeSceneRenderer({
      canvasParent: host,
      assetResolver,
      ...(background !== undefined ? { background } : {}),
    });
    await three.whenReady();
    return {
      kind,
      documentRenderer: three,
      three,
      whenReady: () => three.whenReady(),
      destroy: () => three.destroy(),
      setAssetResolver: (resolver) => three.setAssetResolver(resolver),
      setSelectedNodeIds: (ids) => three.setSelectedNodeIds(ids),
      setThreeTransformMode: (mode) => three.setTransformMode(mode),
      getThreeTransformMode: () => three.getTransformMode(),
      setThreeViewMode: (mode) => three.setViewMode(mode),
      getThreeViewMode: () => three.getViewMode(),
      clientToWorld: (x, y) => three.clientToWorld(x, y),
    };
  }

  const stack: HybridRendererStack = await createHybridRendererStack({
    host,
    assetResolver,
    mode: "editor",
    ...(background !== undefined ? { background } : {}),
  });
  const stopThreeLoop = stack.startExternalThreeLoop();

  return {
    kind,
    documentRenderer: stack.documentRenderer,
    pixi: stack.pixiBackground,
    pixiBackground: stack.pixiBackground,
    pixiForeground: stack.pixiForeground,
    three: stack.three,
    whenReady: async () => undefined,
    destroy: async () => {
      stopThreeLoop();
      await stack.destroy();
    },
    setAssetResolver: (resolver) => {
      stack.pixiBackground.setAssetResolver(resolver);
      stack.three.setAssetResolver(resolver);
      stack.pixiForeground.setAssetResolver(resolver);
    },
    setSelectedNodeIds: (ids) => {
      stack.pixiBackground.setSelectedNodeIds(ids);
      stack.pixiForeground.setSelectedNodeIds(ids);
      stack.three.setSelectedNodeIds(ids);
    },
    setHybridInputLayer: (layer) => stack.setHybridInputLayer(layer),
    setThreeTransformMode: (mode) => stack.three.setTransformMode(mode),
    getThreeTransformMode: () => stack.three.getTransformMode(),
    setThreeViewMode: (mode) => stack.three.setViewMode(mode),
    getThreeViewMode: () => stack.three.getViewMode(),
    clientToWorld: (x, y) => {
      if (stack.hosts.fgHost.style.pointerEvents === "auto") {
        return stack.pixiForeground.clientToWorld(x, y);
      }
      if (stack.hosts.bgHost.style.pointerEvents === "auto") {
        return stack.pixiBackground.clientToWorld(x, y);
      }
      return stack.three.clientToWorld(x, y);
    },
  };
}
