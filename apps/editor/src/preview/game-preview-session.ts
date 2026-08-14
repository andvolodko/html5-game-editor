import type { AssetResolver } from "@game-editor/assets";
import { EventBus } from "@game-editor/core";
import type { ProjectResolution } from "@game-editor/editor-core";
import {
  ComponentRegistry,
  installSceneFlowRuntime,
  type ComponentDefinition,
} from "@game-editor/game-components";
import { projectBackgroundToPixiColor } from "@game-editor/project";
import { PixiSceneRenderer, preloadPixiSceneAsset } from "@game-editor/renderer-pixi";
import { ThreeGltfCache, ThreeSceneRenderer } from "@game-editor/renderer-three";
import {
  getSceneRendererKind,
  nodeBelongsToPixiBackground,
  nodeBelongsToPixiForeground,
  nodeBelongsToThree,
  type SceneData,
} from "@game-editor/scene";
import {
  collectSceneAssetIds,
  createGltfClipScriptLookups,
  createHtmlAudioPlayer,
  GameRuntime,
  GameScreenHost,
  type HtmlAudioPlayerHandle,
} from "@game-editor/runtime";
import { installActiveGameRuntime } from "../components/install-active-game-runtime";
import {
  createHybridRendererStack,
  pickHybridNodeId,
} from "../viewport/hybrid-stack";

export interface GamePreviewStartOptions {
  canvasParent: HTMLElement;
  scene: SceneData;
  assetResolver: AssetResolver;
  /** Design resolution from project.json — drives letterboxing + buffer size. */
  resolution: ProjectResolution;
  /** CSS `#RRGGBB` clear / letterbox color from project.json. */
  background: string;
  /** Session script catalog from the open project (optional). */
  components?: ComponentRegistry;
  /** Active game id — used to restore game-local script `create` factories. */
  projectId?: string | null;
  /** Load a scene by file id for Change Scene / Loading Scene scripts. */
  loadSceneById?: (sceneId: string) => Promise<SceneData>;
  /** All project scenes — used by Load All Scene Assets. */
  listScenes?: () => Promise<readonly SceneData[]>;
  /** Scene file id being started (Assets id, not SceneData.id). */
  sceneId: string;
  /** Fires after the preview actually displays a scene (start or changeScene). */
  onSceneChange?: (scene: SceneData, sceneId: string) => void;
}

interface PreviewRendererBundle {
  destroy(): Promise<void>;
}

function onceDestroyable(bundle: PreviewRendererBundle): PreviewRendererBundle {
  let destroyed = false;
  return {
    async destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      await bundle.destroy();
    },
  };
}

/**
 * Owns an isolated Pixi / Three / hybrid + GameRuntime preview session.
 * Never attaches to EditorViewportController.
 */
export class GamePreviewSession {
  private screen: GameScreenHost | undefined;
  private bundle: PreviewRendererBundle | undefined;
  private runtime: GameRuntime | undefined;
  private bus: EventBus | undefined;
  private startToken = 0;
  private rafId = 0;
  private lastFrameMs = 0;
  private audioPlayer: HtmlAudioPlayerHandle | undefined;
  private sceneChangeSeq = 0;
  private switchScene:
    | ((sceneId: string) => Promise<void>)
    | undefined;

  get isRunning(): boolean {
    return this.runtime !== undefined;
  }

  /** Preview-session event bus (available while running). */
  getBus(): EventBus | undefined {
    return this.bus;
  }

  async start(options: GamePreviewStartOptions): Promise<void> {
    const token = ++this.startToken;
    await this.disposeInternal();

    const screen = new GameScreenHost(options.canvasParent, options.resolution);
    const design = screen.getResolution();
    options.canvasParent.style.background = options.background;
    const pixiBgColor = projectBackgroundToPixiColor(options.background);

    const bus = new EventBus();
    const components = cloneComponentRegistry(options.components);
    installSceneFlowRuntime(components);
    await installActiveGameRuntime(options.projectId, components);

    if (token !== this.startToken) {
      screen.destroy();
      return;
    }

    const gltfCache = new ThreeGltfCache();
    gltfCache.setResolver(options.assetResolver);
    const audioPlayer = createHtmlAudioPlayer((assetId) =>
      options.assetResolver.resolveUrl(assetId),
    );
    this.audioPlayer = audioPlayer;

    const runtimeRef: { current?: GameRuntime } = {};
    const applySceneRef: {
      current: (sceneId: string, scene: SceneData) => Promise<void>;
    } = {
      current: async () => undefined,
    };

    const runtime = new GameRuntime({
      components,
      services: {
        bus,
        changeScene: async (sceneId) => {
          if (!options.loadSceneById) {
            return;
          }
          const next = await options.loadSceneById(sceneId);
          if (token !== this.startToken) {
            return;
          }
          await applySceneRef.current(sceneId, next);
        },
        resolveAssetUrl: (assetId) =>
          options.assetResolver.resolveUrl(assetId),
        listAllSceneAssetIds: async () => {
          const scenes = options.listScenes
            ? await options.listScenes()
            : [options.scene];
          if (token !== this.startToken) {
            return [];
          }
          return collectSceneAssetIds(scenes);
        },
        preloadSceneAsset: async (assetId, signal) => {
          if (options.assetResolver.resolveGltfUrls?.(assetId)) {
            await gltfCache.ensureLoaded(assetId);
            return;
          }
          await preloadPixiSceneAsset(options.assetResolver, assetId, signal);
        },
        playAudio: (assetId, playOptions) =>
          audioPlayer.play(assetId, playOptions),
        stopAudio: (assetId) => audioPlayer.stop(assetId),
        ...createGltfClipScriptLookups(
          () => runtimeRef.current?.getScene(),
          {
            listNames: (assetId) => gltfCache.listAnimationNames(assetId),
            duration: (assetId, animation) => {
              const clips = gltfCache.getClips(assetId);
              const clip = animation
                ? clips.find((entry) => entry.name === animation)
                : clips[0];
              return clip?.duration;
            },
          },
        ),
      },
    });
    runtimeRef.current = runtime;

    applySceneRef.current = async (sceneId, scene) => {
      const changeSeq = ++this.sceneChangeSeq;
      const previous = this.bundle;
      this.bundle = undefined;
      if (previous) {
        await previous.destroy();
      }
      if (token !== this.startToken || changeSeq !== this.sceneChangeSeq) {
        return;
      }
      runtime.clearRenderers();
      const nextBundle = onceDestroyable(
        await mountPreviewRenderers({
          frame: screen.frame,
          kind: getSceneRendererKind(scene),
          assetResolver: options.assetResolver,
          design,
          pixiBgColor,
          runtime,
          gltfCache,
        }),
      );
      if (token !== this.startToken || changeSeq !== this.sceneChangeSeq) {
        await nextBundle.destroy();
        return;
      }
      this.bundle = nextBundle;
      runtime.loadScene(scene);
      runtime.resize(design.width, design.height);
      runtime.render();
      options.onSceneChange?.(scene, sceneId);
    };

    this.switchScene = async (sceneId) => {
      if (!options.loadSceneById) {
        return;
      }
      const next = await options.loadSceneById(sceneId);
      if (token !== this.startToken) {
        return;
      }
      await applySceneRef.current(sceneId, next);
    };

    this.screen = screen;
    this.runtime = runtime;
    this.bus = bus;
    await applySceneRef.current(options.sceneId, options.scene);
    if (token !== this.startToken) {
      await this.disposeInternal();
      return;
    }

    this.lastFrameMs = performance.now();
    this.scheduleFrame(token);
  }

  async changeScene(sceneId: string): Promise<void> {
    await this.switchScene?.(sceneId);
  }

  async stop(): Promise<void> {
    this.startToken += 1;
    await this.disposeInternal();
  }

  private scheduleFrame(token: number): void {
    this.rafId = requestAnimationFrame((nowMs) => {
      if (token !== this.startToken) {
        return;
      }
      const runtime = this.runtime;
      if (!runtime) {
        return;
      }
      const MS_PER_SECOND = 1000;
      const dt = Math.max(0, (nowMs - this.lastFrameMs) / MS_PER_SECOND);
      this.lastFrameMs = nowMs;
      runtime.tick(dt);
      runtime.render();
      this.scheduleFrame(token);
    });
  }

  private async disposeInternal(): Promise<void> {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.runtime?.dispose();
    this.runtime = undefined;
    this.switchScene = undefined;
    this.audioPlayer?.stop();
    this.audioPlayer = undefined;
    this.bus?.clear();
    this.bus = undefined;
    const bundle = this.bundle;
    this.bundle = undefined;
    if (bundle) {
      await bundle.destroy();
    }
    this.screen?.destroy();
    this.screen = undefined;
  }
}

async function mountPreviewRenderers(args: {
  frame: HTMLElement;
  kind: ReturnType<typeof getSceneRendererKind>;
  assetResolver: AssetResolver;
  design: ProjectResolution;
  pixiBgColor: number;
  runtime: GameRuntime;
  gltfCache: ThreeGltfCache;
}): Promise<PreviewRendererBundle> {
  const { frame, kind, assetResolver, design, pixiBgColor, runtime, gltfCache } =
    args;
  frame.replaceChildren();

  if (kind === "three") {
    const three = new ThreeSceneRenderer({
      canvasParent: frame,
      assetResolver,
      editable: false,
      background: pixiBgColor,
      gltfCache,
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
    const stack = await createHybridRendererStack({
      host: frame,
      assetResolver,
      mode: "preview",
      designResolution: design,
      pixiBackgroundColor: pixiBgColor,
      gltfCache,
    });

    runtime.registerRenderer({
      kind: "pixi",
      renderer: stack.pixiBackground,
      layer: { id: "pixi-bg", renderer: "pixi", order: 0 },
      accepts: nodeBelongsToPixiBackground,
    });
    runtime.registerRenderer({
      kind: "three",
      renderer: stack.three,
      layer: { id: "three", renderer: "three", order: 100 },
      accepts: nodeBelongsToThree,
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer: stack.pixiForeground,
      layer: { id: "pixi-fg", renderer: "pixi", order: 200 },
      accepts: nodeBelongsToPixiForeground,
    });

    let downNodeId: string | undefined;
    const onPointerDown = (event: PointerEvent) => {
      downNodeId = pickHybridNodeId(stack, event.clientX, event.clientY);
      if (downNodeId) {
        runtime.emitNodePointerEvent(downNodeId, "pointerdown");
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const nodeId = pickHybridNodeId(stack, event.clientX, event.clientY);
      if (nodeId) {
        runtime.emitNodePointerEvent(nodeId, "pointerup");
        if (nodeId === downNodeId) {
          runtime.emitNodePointerEvent(nodeId, "pointertap");
        }
      }
      downNodeId = undefined;
    };
    const onPointerMove = (event: PointerEvent) => {
      const nodeId = pickHybridNodeId(stack, event.clientX, event.clientY);
      stack.hosts.inputHost.style.cursor =
        (nodeId
          ? (stack.pixiForeground.getNodeCursor?.(nodeId) ??
            stack.pixiBackground.getNodeCursor?.(nodeId))
          : undefined) ?? "";
    };
    stack.hosts.inputHost.addEventListener("pointerdown", onPointerDown);
    stack.hosts.inputHost.addEventListener("pointerup", onPointerUp);
    stack.hosts.inputHost.addEventListener("pointermove", onPointerMove);

    return {
      destroy: async () => {
        stack.hosts.inputHost.removeEventListener("pointerdown", onPointerDown);
        stack.hosts.inputHost.removeEventListener("pointerup", onPointerUp);
        stack.hosts.inputHost.removeEventListener("pointermove", onPointerMove);
        await stack.destroy();
      },
    };
  }

  const pixi = new PixiSceneRenderer({
    canvasParent: frame,
    assetResolver,
    editable: false,
    designResolution: design,
    background: pixiBgColor,
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

function cloneComponentRegistry(
  source: ComponentRegistry | undefined,
): ComponentRegistry {
  const next = new ComponentRegistry();
  if (!source) {
    return next;
  }
  for (const def of source.list()) {
    const clone: ComponentDefinition = {
      id: def.id,
      displayName: def.displayName,
      category: def.category,
      categoryOrder: def.categoryOrder,
      order: def.order,
      properties: structuredClone(def.properties),
      ...(def.allowMultiple !== undefined
        ? { allowMultiple: def.allowMultiple }
        : {}),
      ...(def.create ? { create: def.create } : {}),
    };
    next.register(clone);
  }
  return next;
}
