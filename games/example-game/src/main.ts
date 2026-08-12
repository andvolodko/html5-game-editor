import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import { GameRuntime } from "@game-editor/runtime";
import { createEmptyScene, createEmptyNode } from "@game-editor/scene";

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app element missing");
}

const scene = createEmptyScene("Example Scene");
const root = createEmptyNode("Root");
root.components.push({
  type: "Transform2D",
  id: "transform_root",
  position: { x: 0, y: 0 },
  rotation: 0,
  scale: { x: 1, y: 1 },
});
scene.nodes.push(root);

const runtime = new GameRuntime();
runtime.registerRenderer({
  kind: "pixi",
  renderer: new PixiSceneRenderer(),
  layer: { id: "main", renderer: "pixi", order: 0 },
});
runtime.loadScene(scene);
runtime.resize(800, 600);
runtime.render();

app.innerHTML = `
  <main style="font-family: Segoe UI, sans-serif; padding: 2rem; color: #e8ecf4; background: #12151c; min-height: 100vh;">
    <h1>Example Game</h1>
    <p>Independently buildable Vite app using workspace runtime packages.</p>
    <p>Scene: <strong>${scene.name}</strong> (v${String(scene.version)})</p>
    <p>Nodes: ${String(scene.nodes.length)} · Renderers: ${runtime.getRegisteredRenderers().join(", ")}</p>
    <p style="opacity: 0.7;">Pixi rendering is stubbed for the foundation milestone.</p>
  </main>
`;
