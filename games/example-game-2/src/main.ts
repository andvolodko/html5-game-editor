import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import {
  GameRuntime,
  resolveGameProject,
  sceneModulesById,
} from "@game-editor/runtime";
import projectJson from "../project.json";
import assetsJson from "../.project/assets.json";

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

const runtime = new GameRuntime();

async function boot(): Promise<void> {
  const loaded = resolveGameProject({
    project: projectJson,
    assets: assetsJson,
    scenes: sceneModulesById(sceneModules),
  });

  const renderer = new PixiSceneRenderer({
    canvasParent: viewport,
    assetResolver: loaded.assetResolver,
    editable: false,
  });
  await renderer.whenReady();

  runtime.registerRenderer({
    kind: "pixi",
    renderer,
    layer: { id: "main", renderer: "pixi", order: 0 },
  });
  runtime.loadScene(loaded.scene);
  runtime.resize(viewport.clientWidth, viewport.clientHeight);
  runtime.render();

  document.title = loaded.project.displayName;
}

void boot();
