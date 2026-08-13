import {
  ThreeSceneRenderer,
  type ThreeGltfCache,
} from "@game-editor/renderer-three";
import { getSceneRendererKind, type SceneData } from "@game-editor/scene";
import type { GameRuntime, LoadedGameProject } from "@game-editor/runtime";

export interface MountedGameRenderers {
  destroy(): Promise<void>;
}

/**
 * Registers the Three.js stack for the standalone muonline-game boot.
 * Pixi is omitted so this game does not bundle a 2D renderer.
 */
export async function mountMuonlineGameRenderers(args: {
  frame: HTMLElement;
  scene: SceneData;
  assetResolver: LoadedGameProject["assetResolver"];
  backgroundColor: number;
  runtime: GameRuntime;
  gltfCache?: ThreeGltfCache;
}): Promise<MountedGameRenderers> {
  const { frame, scene, assetResolver, backgroundColor, runtime, gltfCache } =
    args;
  const kind = getSceneRendererKind(scene);
  if (kind !== "three") {
    throw new Error(
      `muonline-game only mounts Three.js scenes (got "${kind}")`,
    );
  }

  frame.replaceChildren();
  const three = new ThreeSceneRenderer({
    canvasParent: frame,
    assetResolver,
    editable: false,
    background: backgroundColor,
    ...(gltfCache ? { gltfCache } : {}),
  });
  await three.whenReady();
  runtime.registerRenderer({
    kind: "three",
    renderer: three,
    layer: { id: "main", renderer: "three", order: 0 },
  });
  const onPointer = (event: PointerEvent) => {
    const nodeId = three.pickNodeId(event.clientX, event.clientY);
    if (!nodeId) {
      return;
    }
    if (event.type === "pointerdown") {
      runtime.emitNodePointerEvent(nodeId, "pointerdown");
    } else if (event.type === "pointerup") {
      runtime.emitNodePointerEvent(nodeId, "pointerup");
      runtime.emitNodePointerEvent(nodeId, "pointertap");
    }
  };
  frame.addEventListener("pointerdown", onPointer);
  frame.addEventListener("pointerup", onPointer);
  return {
    destroy: async () => {
      frame.removeEventListener("pointerdown", onPointer);
      frame.removeEventListener("pointerup", onPointer);
      await three.destroy();
    },
  };
}
