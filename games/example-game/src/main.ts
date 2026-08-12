import { EventBus } from "@game-editor/core";
import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import {
  ComponentRegistry,
  installSceneFlowRuntime,
} from "@game-editor/game-components";
import {
  GameRuntime,
  GameScreenHost,
  resolveGameProject,
  sceneModulesById,
  type LoadedGameProject,
} from "@game-editor/runtime";
import { parseSceneData, type SceneData } from "@game-editor/scene";
import projectJson from "../project.json";
import assetsJson from "../.project/assets.json";
import {
  installExampleGameRuntime,
  registerGameComponents,
} from "./components/index.js";

const sceneModules = import.meta.glob("../assets/scenes/*.json", {
  eager: true,
  import: "default",
});

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app element missing");
}
const root = app;

const viewport = document.createElement("div");
viewport.style.position = "fixed";
viewport.style.inset = "0";
viewport.style.background = "#0b0d12";
root.appendChild(viewport);

const bus = new EventBus();
const scenesById = sceneModulesById(sceneModules);
const components = new ComponentRegistry();

const session: {
  runtime?: GameRuntime;
  loaded?: LoadedGameProject;
  screen?: GameScreenHost;
} = {};

function readScene(sceneId: string): SceneData {
  const raw = scenesById[sceneId];
  if (raw === undefined) {
    throw new Error(`Unknown scene "${sceneId}"`);
  }
  return parseSceneData(raw);
}

function changeScene(sceneId: string): void {
  const { runtime, loaded } = session;
  if (!runtime || !loaded) {
    return;
  }
  const design = loaded.project.resolution;
  runtime.loadScene(readScene(sceneId));
  runtime.resize(design.width, design.height);
  runtime.render();
}

registerGameComponents(components);
installSceneFlowRuntime(components);
installExampleGameRuntime(components);

session.runtime = new GameRuntime({
  components,
  services: { bus, changeScene },
});

async function boot(): Promise<void> {
  session.loaded = resolveGameProject({
    project: projectJson,
    assets: assetsJson,
    scenes: scenesById,
  });

  const design = session.loaded.project.resolution;
  const screen = new GameScreenHost(viewport, design);
  session.screen = screen;

  const renderer = new PixiSceneRenderer({
    canvasParent: screen.frame,
    assetResolver: session.loaded.assetResolver,
    editable: false,
    designResolution: design,
  });
  await renderer.whenReady();

  const runtime = session.runtime;
  if (!runtime) {
    throw new Error("GameRuntime missing");
  }

  runtime.registerRenderer({
    kind: "pixi",
    renderer,
    layer: { id: "main", renderer: "pixi", order: 0 },
  });
  renderer.setPointerHandlers({
    onNodeClick: (nodeId) => runtime.emitNodeClick(nodeId),
  });
  runtime.loadScene(session.loaded.scene);
  runtime.resize(design.width, design.height);
  runtime.render();

  let lastFrameMs = performance.now();
  const MS_PER_SECOND = 1000;
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
