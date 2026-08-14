# Scene model

Serializable scene graph, components, transforms, validation, and prefabs.

Orientation: [`PROJECT.md`](../PROJECT.md). Renderers: [`renderers.md`](./renderers.md). Assets: [`assets.md`](./assets.md).

---

## Scene data

A scene contains nodes. The serialized model is engine-neutral.

```ts
interface SceneData {
  id: string;
  name: string;
  version: number;
  nodes: SceneNodeData[];
}

interface SceneNodeData {
  id: string;
  name: string;
  parentId?: string;
  components: ComponentData[];
  children: SceneNodeData[];
}
```

Never store runtime instances such as `PIXI.Sprite` or `THREE.Mesh` inside the scene domain model. Renderer adapters translate scene data into PixiJS or Three.js objects.

Scene data must remain serializable, deterministic, Git-friendly, and renderer-independent.

---

## Composition over inheritance

Avoid large node-type inheritance trees (`SpriteNode`, `ThreeMeshNode`, `ButtonNode`, …). Prefer components on a generic node.

Example 2D entity:

```text
Node
├── Transform2D
├── Sprite
└── Button
```

Example 3D entity:

```text
Node
├── Transform3D
├── Model3D
├── Animator
└── Collider
```

Example components: `Transform2D`, `Transform3D`, `Sprite`, `Text`, `Spine`, `Model3D`, `Camera3D`, `Camera2D`, `Light3D`, `Animator`, `AudioSource`, `Button`, `ParticleEmitter`, `Layout`.

Components must contain serializable data. Runtime-specific objects live outside serialized component data.

---

## Transforms

Do not force 2D and 3D transforms into the same structure merely to reduce type count.

```ts
interface Transform2D {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  anchor?: { x: number; y: number };
}

interface Transform3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}
```

---

## Stable IDs

Every persistent entity must have a stable ID: assets, scene nodes, components, prefabs, scenes.

Scenes reference assets with `assetId`, not filesystem paths:

```json
{ "texture": "asset_42" }
```

Avoid `"../../assets/ui/button.png"`. Moving or renaming an asset must not invalidate scenes. IDs come from `createId(prefix)` in `@game-editor/shared`.

---

## Runtime validation

Serialized JSON is external input. Do not assume a JSON file matches TypeScript interfaces simply because the editor generated it.

Scene, project, and asset metadata should have runtime schema validation (Zod: `parseSceneData`, `parseAssetDatabase`, project parsers).

Serialized variants use discriminated unions on `type` / `kind`. Keep discriminants and Zod schemas aligned.

---

## Serialization versions

Persisted formats must contain a format/schema version:

```json
{ "version": 1 }
```

Future incompatible changes must go through migrations. Never silently reinterpret old persisted structures.

Scene JSON should be deterministic and human-diff-friendly. Avoid unnecessary property reordering. Avoid storing generated or transient state in scene files.

---

## Prefabs

Architecture must allow prefabs later. A prefab is a reusable serialized node hierarchy:

```text
prefabs/
├── spin-button.prefab.json
├── paytable.prefab.json
└── character.prefab.json
```

Prefab design should eventually support instances, overrides, and nested prefabs. Do not implement complex prefab inheritance in MVP unless explicitly requested.

Script component class instances and functions must never be persisted in scene JSON. See `.cursor/skills/create-game-component/SKILL.md`.
