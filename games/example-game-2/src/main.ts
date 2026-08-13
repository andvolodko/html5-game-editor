import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import { ComponentRegistry } from "@game-editor/game-components";
import {
  GAME_MOUNT_ELEMENT_ID,
  projectBackgroundToPixiColor,
} from "@game-editor/project";
import {
  GameRuntime,
  GameScreenHost,
  resolveGameProject,
  sceneModulesById,
} from "@game-editor/runtime";
import projectJson from "../project.json";
import assetsJson from "../.project/assets.json";
import { registerGameComponents } from "./components/index.js";

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

const components = new ComponentRegistry();
registerGameComponents(components);
const runtime = new GameRuntime({ components });

async function boot(): Promise<void> {
  const loaded = resolveGameProject({
    project: projectJson,
    assets: assetsJson,
    scenes: sceneModulesById(sceneModules),
    baseUrl: import.meta.env.BASE_URL,
  });

  const design = loaded.project.resolution;
  const background = loaded.project.background;
  viewport.style.background = background;
  const screen = new GameScreenHost(viewport, design);

  const renderer = new PixiSceneRenderer({
    canvasParent: screen.frame,
    assetResolver: loaded.assetResolver,
    editable: false,
    designResolution: design,
    background: projectBackgroundToPixiColor(background),
  });
  await renderer.whenReady();

  runtime.registerRenderer({
    kind: "pixi",
    renderer,
    layer: { id: "main", renderer: "pixi", order: 0 },
  });
  runtime.loadScene(loaded.scene);
  runtime.resize(design.width, design.height);
  runtime.render();

  document.title = loaded.project.displayName;
}

void boot();
