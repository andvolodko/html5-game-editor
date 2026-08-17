# Renderers

PixiJS and Three.js adapters, hybrid layering, and supported node types.

Orientation: [`PROJECT.md`](../PROJECT.md). Scene data: [`scene-model.md`](./scene-model.md). Runtime bundling: [`runtime.md`](./runtime.md).

Renderer-specific implementation belongs in `renderer-pixi` or `renderer-three`. Never put `PIXI.*` or `THREE.*` types into the serialized domain model.

---

## Adapter architecture

Rendering must be adapter-based. Define an abstraction approximately like:

```ts
interface SceneRenderer {
  createNode(node: SceneNodeData): void;
  updateNode(node: SceneNodeData): void;
  destroyNode(nodeId: string): void;
  resize(width: number, height: number): void;
  render(): void;
}
```

Implementations: `PixiSceneRenderer`, `ThreeSceneRenderer`.

Runtime object mappings live inside renderer/runtime layers: `sceneNodeId` → `PIXI.DisplayObject` or `THREE.Object3D`.

---

## Hybrid PixiJS + Three.js

A scene may contain both 2D and 3D content. The architecture must support renderer layers.

Example:

```text
Layer 200 → Pixi UI
Layer 100 → Three 3D world
Layer   0 → Pixi background
```

```ts
interface RenderLayer {
  id: string;
  renderer: "pixi" | "three";
  order: number;
}
```

For the first implementation it is acceptable to use multiple stacked canvases (Pixi foreground/UI, Three world, Pixi background). Do not tightly couple scene logic to the number of canvases. Canvas composition is a renderer implementation detail.

---

## Three.js support

Initial supported 3D resources: GLB, GLTF, textures, HDR environments.

Initial supported Three components: `Transform3D`, `Model3D`, `PerspectiveCamera`, `DirectionalLight`, `AmbientLight`.

Future compatibility should allow animation, materials, particles, shadows, post-processing, physics, navigation, instancing. Do not implement all future systems prematurely. Design extension points instead.

---

## PixiJS support

Installed runtime: **pixi.js@8.19.0** (see `@game-editor/renderer-pixi`).

Initial supported resources: PNG, JPG, WebP, spritesheets, Aseprite / LibreSprite (`.aseprite`, `.ase`) compiled to PNG + Pixi JSON, fonts, audio metadata where appropriate.

### Supported Pixi node types

| Type | Status | Notes |
| --- | --- | --- |
| Container | Supported | Transform2D-only grouping; `canHaveChildren` |
| Sprite | Supported | Texture or Aseprite `assetId` + display size |
| NineSliceSprite | Supported | |
| TilingSprite | Supported | |
| Graphics | Supported | MVP shapes: rect / rounded-rect / circle / ellipse / polygon |
| Text | Supported | Common TextStyle subset, including linear fill gradients (`fill` color stops) and webfont `style.fontAssetId` |
| BitmapText | Supported | AngelCode BMFont (`font` assetId); unassigned/missing → placeholder |
| HTMLText | Supported | Same TextStyle subset as Text, including webfont `style.fontAssetId` |
| Mesh | Supported | Default textured quad (no custom shader editor) |
| MeshSimple | Supported | |
| MeshRope | Supported | |
| MeshPlane | Supported | |
| PerspectiveMesh | Supported | Corner positions in Inspector |
| AnimatedSprite | Supported | Frames as assetId[], or Aseprite `assetId` + `animation` tag; play/loop/speed |
| Spine | Supported | Bundled skeleton+atlas+pages; Pixi playback via `@esotericsoftware/spine-pixi-v8` |
| Tilemap | Supported | One node; chunked cells; `@pixi/tilemap` `CompositeTilemap` per chunk. Animated tiles share one clock per logical ID and rebuild only chunks that contain that ID. Not `TilingSprite`. |
| ParticleContainer | Deferred | Pixi Particle API accepts Particle children only — incompatible with Container hierarchy |

Node creation is driven by `NodeTypeRegistry` (`pixi.*` stable IDs). Menus and `CreateNodeCommand` share that registry. Leaf visuals cannot receive scene children (domain `canMoveNode` / create-parent policy).

Future compatibility: particles / ParticleContainer (experimental), masks, filters, custom shaders, visual mesh vertex editor.
