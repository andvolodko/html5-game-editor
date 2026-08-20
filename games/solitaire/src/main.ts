import {
  ComponentRegistry,
  installSceneFlowRuntime,
} from "@game-editor/game-components";
import {
  GAME_MOUNT_ELEMENT_ID,
  projectBackgroundToPixiColor,
  type ProjectResolution,
} from "@game-editor/project";
import {
  PixiSceneRenderer,
  preloadPixiSceneAsset,
} from "@game-editor/renderer-pixi";
import {
  EventBus,
  GameRuntime,
  GameScreenHost,
  bindDocumentVisibilityPause,
  collectSceneAssetIds,
  createHtmlAudioPlayer,
  resolveGameProject,
  sceneModulesById,
  type LoadedGameProject,
} from "@game-editor/runtime";
import {
  getSceneRendererKind,
  parseSceneData,
  type SceneData,
  type SceneRendererKind,
} from "@game-editor/scene";
import projectJson from "../project.json";
import assetsJson from "../.project/assets.json";
import {
  installGameRuntime,
  registerGameComponents,
} from "./components/index.js";

const MS_PER_SECOND = 1000;

const sceneModules = import.meta.glob("../assets/scenes/*.json", {
  eager: true,
  import: "default",
});

const app = document.querySelector(`#${GAME_MOUNT_ELEMENT_ID}`);
if (!app) {
  throw new Error(`#${GAME_MOUNT_ELEMENT_ID} element missing`);
}
const root = app;

const viewport = document.createElement("div");
viewport.style.position = "fixed";
viewport.style.inset = "0";
root.appendChild(viewport);

const bus = new EventBus();
const scenesById = sceneModulesById(sceneModules);
const components = new ComponentRegistry();

const session: {
  runtime?: GameRuntime;
  loaded?: LoadedGameProject;
  screen?: GameScreenHost;
  renderers?: { destroy(): Promise<void> };
  rendererKind?: SceneRendererKind;
} = {};

function readScene(sceneId: string): SceneData {
  const raw = scenesById[sceneId];
  if (raw === undefined) {
    throw new Error(`Unknown scene "${sceneId}"`);
  }
  return parseSceneData(raw);
}

async function mountPixiRenderer(args: {
  frame: HTMLElement;
  assetResolver: LoadedGameProject["assetResolver"];
  design: ProjectResolution;
  backgroundColor: number;
  runtime: GameRuntime;
}): Promise<{ destroy(): Promise<void> }> {
  const { frame, assetResolver, design, backgroundColor, runtime } = args;
  frame.replaceChildren();
  runtime.clearRenderers();
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

async function changeScene(sceneId: string): Promise<void> {
  const { runtime, loaded, screen } = session;
  if (!runtime || !loaded || !screen) {
    return;
  }
  const design = loaded.project.resolution;
  const next = readScene(sceneId);
  const nextKind = getSceneRendererKind(next);
  if (session.rendererKind !== nextKind) {
    await session.renderers?.destroy();
    session.renderers = await mountPixiRenderer({
      frame: screen.frame,
      assetResolver: loaded.assetResolver,
      design,
      backgroundColor: projectBackgroundToPixiColor(loaded.project.background),
      runtime,
    });
    session.rendererKind = nextKind;
  }
  runtime.loadScene(next);
  runtime.resize(design.width, design.height);
  runtime.render();
}

registerGameComponents(components);
installSceneFlowRuntime(components);
installGameRuntime(components);

const htmlAudio = createHtmlAudioPlayer(
  (assetId) => session.loaded?.assetResolver.resolveUrl(assetId),
);

session.runtime = new GameRuntime({
  components,
  services: {
    bus,
    changeScene: (sceneId) => {
      void changeScene(sceneId);
    },
    resolveAssetUrl: (assetId) =>
      session.loaded?.assetResolver.resolveUrl(assetId),
    listAllSceneAssetIds: () => {
      const loaded = session.loaded;
      if (!loaded) {
        return [];
      }
      return collectSceneAssetIds(Object.values(loaded.scenes));
    },
    preloadSceneAsset: async (assetId, signal) => {
      const resolver = session.loaded?.assetResolver;
      if (!resolver) {
        return;
      }
      await preloadPixiSceneAsset(resolver, assetId, signal);
    },
    playAudio: (assetId, options) => htmlAudio.play(assetId, options),
    stopAudio: (assetId) => htmlAudio.stop(assetId),
    setAudioEnabled: (enabled) => htmlAudio.setEnabled(enabled),
    setAudioVolume: (assetId, volume) => htmlAudio.setVolume(assetId, volume),
  },
});

async function boot(): Promise<void> {
  session.loaded = resolveGameProject({
    project: projectJson,
    assets: assetsJson,
    scenes: scenesById,
    baseUrl: import.meta.env.BASE_URL,
  });

  const design = session.loaded.project.resolution;
  const background = session.loaded.project.background;
  viewport.style.background = background;
  const screen = new GameScreenHost(viewport, design);
  session.screen = screen;

  const runtime = session.runtime;
  if (!runtime) {
    throw new Error("GameRuntime missing");
  }

  session.renderers = await mountPixiRenderer({
    frame: screen.frame,
    assetResolver: session.loaded.assetResolver,
    design,
    backgroundColor: projectBackgroundToPixiColor(background),
    runtime,
  });
  session.rendererKind = getSceneRendererKind(session.loaded.scene);

  runtime.loadScene(session.loaded.scene);
  runtime.resize(design.width, design.height);
  runtime.render();

  bindDocumentVisibilityPause({
    setPaused: (paused) => {
      runtime.setPaused(paused);
    },
    setAudioPaused: (paused) => {
      htmlAudio.setPaused(paused);
    },
  });

  let lastFrameMs = performance.now();
  const frame = (nowMs: number): void => {
    const dt = Math.max(0, (nowMs - lastFrameMs) / MS_PER_SECOND);
    lastFrameMs = nowMs;
    runtime.tick(dt);
    runtime.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  document.title = session.loaded.project.displayName;
}

void boot();
