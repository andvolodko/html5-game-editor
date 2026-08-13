import type { ProjectResolution } from "@game-editor/project";
import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import {
  ThreeSceneRenderer,
  type ThreeGltfCache,
} from "@game-editor/renderer-three";
import {
  getSceneRendererKind,
  nodeBelongsToPixiBackground,
  nodeBelongsToPixiForeground,
  nodeBelongsToThree,
  type SceneData,
} from "@game-editor/scene";
import type { GameRuntime, LoadedGameProject } from "@game-editor/runtime";

export interface MountedGameRenderers {
  destroy(): Promise<void>;
}

/**
 * Registers Pixi / Three / hybrid stacks for the standalone editor-features-demo boot.
 * Mirrors editor preview composition; Three is only constructed when needed.
 */
export async function mountEditorFeaturesDemoRenderers(args: {
  frame: HTMLElement;
  scene: SceneData;
  assetResolver: LoadedGameProject["assetResolver"];
  design: ProjectResolution;
  backgroundColor: number;
  runtime: GameRuntime;
  gltfCache?: ThreeGltfCache;
}): Promise<MountedGameRenderers> {
  const { frame, scene, assetResolver, design, backgroundColor, runtime, gltfCache } =
    args;
  const kind = getSceneRendererKind(scene);
  frame.replaceChildren();

  if (kind === "three") {
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

  if (kind === "hybrid") {
    // Inline stack (game package must not import apps/editor).
    const stack = document.createElement("div");
    stack.className = "scene-viewport-stack";
    stack.style.position = "absolute";
    stack.style.inset = "0";
    frame.appendChild(stack);

    const layer = (className: string) => {
      const el = document.createElement("div");
      el.className = `scene-viewport-layer ${className}`;
      el.style.position = "absolute";
      el.style.inset = "0";
      stack.appendChild(el);
      return el;
    };
    const bgHost = layer("scene-viewport-bg");
    const midHost = layer("scene-viewport-mid");
    const fgHost = layer("scene-viewport-fg");
    const inputHost = layer("scene-viewport-input");
    bgHost.style.pointerEvents = "none";
    midHost.style.pointerEvents = "none";
    fgHost.style.pointerEvents = "none";
    inputHost.style.pointerEvents = "auto";

    const pixiBg = new PixiSceneRenderer({
      canvasParent: bgHost,
      assetResolver,
      editable: false,
      designResolution: design,
      background: backgroundColor,
    });
    const three = new ThreeSceneRenderer({
      canvasParent: midHost,
      assetResolver,
      editable: false,
      backgroundAlpha: 0,
      autoRender: false,
      ...(gltfCache ? { gltfCache } : {}),
    });
    const pixiFg = new PixiSceneRenderer({
      canvasParent: fgHost,
      assetResolver,
      editable: false,
      designResolution: design,
      backgroundAlpha: 0,
    });
    await Promise.all([
      pixiBg.whenReady(),
      three.whenReady(),
      pixiFg.whenReady(),
    ]);

    runtime.registerRenderer({
      kind: "pixi",
      renderer: pixiBg,
      layer: { id: "pixi-bg", renderer: "pixi", order: 0 },
      accepts: nodeBelongsToPixiBackground,
    });
    runtime.registerRenderer({
      kind: "three",
      renderer: three,
      layer: { id: "three", renderer: "three", order: 100 },
      accepts: nodeBelongsToThree,
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: pixiFg,
      layer: { id: "pixi-fg", renderer: "pixi", order: 200 },
      accepts: nodeBelongsToPixiForeground,
    });

    let downId: string | undefined;
    const pick = (x: number, y: number) =>
      pixiFg.pickNodeId(x, y) ??
      three.pickNodeId(x, y) ??
      pixiBg.pickNodeId(x, y);
    const onDown = (event: PointerEvent) => {
      downId = pick(event.clientX, event.clientY);
      if (downId) {
        runtime.emitNodePointerEvent(downId, "pointerdown");
      }
    };
    const onUp = (event: PointerEvent) => {
      const id = pick(event.clientX, event.clientY);
      if (id) {
        runtime.emitNodePointerEvent(id, "pointerup");
        if (id === downId) {
          runtime.emitNodePointerEvent(id, "pointertap");
        }
      }
      downId = undefined;
    };
    inputHost.addEventListener("pointerdown", onDown);
    inputHost.addEventListener("pointerup", onUp);

    return {
      destroy: async () => {
        inputHost.removeEventListener("pointerdown", onDown);
        inputHost.removeEventListener("pointerup", onUp);
        await Promise.all([
          pixiBg.destroy(),
          three.destroy(),
          pixiFg.destroy(),
        ]);
      },
    };
  }

  const pixi = new PixiSceneRenderer({
    canvasParent: frame,
    assetResolver,
    editable: false,
    designResolution: design,
    background: backgroundColor,
  });
  await pixi.whenReady();
  runtime.registerRenderer({
    kind: "pixi",
    renderer: pixi,
    layer: { id: "main", renderer: "pixi", order: 0 },
  });
  pixi.setPointerHandlers({
    onNodePointerEvent: (nodeId, event) =>
      runtime.emitNodePointerEvent(nodeId, event),
  });
  return {
    destroy: () => pixi.destroy(),
  };
}
