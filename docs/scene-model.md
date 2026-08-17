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
  visible?: boolean; // omit = true; persist false when hidden at runtime
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

Example components: `Transform2D`, `Transform3D`, `Sprite`, `Text`, `Spine`, `Tilemap`, `Model3D`, `Camera3D`, `Camera2D`, `Light3D`, `Animator`, `AudioSource`, `Button`, `ParticleEmitter`, `Layout`.

A `Tilemap` is one scene node. Tile cells live in sparse chunks on the component (`EMPTY_TILE = -1`). They are not child nodes and must not be serialized as Pixi objects. Animated tiles still store a single logical tile ID per cell; frame playback is TileSet metadata plus a transient shared clock.

Components must contain serializable data. Runtime-specific objects live outside serialized component data.

---

## Transforms

Do not force 2D and 3D transforms into the same structure merely to reduce type count.

```ts
interface Transform2D {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  skew?: { x: number; y: number };
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

A prefab is a versioned, engine-neutral document whose `root` reuses the same serializable node/component types as scenes:

```ts
interface PrefabData {
  version: number; // PREFAB_SCHEMA_VERSION
  id: string;      // prefab_…
  name: string;
  root: SceneNodeData;
}
```

Catalogue records use `type: "prefab"` and a stable `assetId`. Scene instances never store filesystem paths.

Instance metadata lives on `SceneNodeData.prefab` (optional; existing scenes stay valid):

```ts
interface PrefabInstanceLink {
  prefabAssetId: string;
  instanceId: string;
  sourceNodeId: string;
  componentSources: Record<string, string>; // scene comp id → source comp id
  isRoot?: boolean;
  overrides?: PrefabOverride[];
}
```

Prefab source node IDs and scene instance node IDs are distinct. Mapping is via `sourceNodeId` + `componentSources`.

Resolution (`resolveScenePrefabs` / `resolvePrefabInstance` in `packages/scene/src/prefab/`) is a pure domain step:

```text
Serialized scene + prefab catalog
        ↓
Resolved scene graph
        ↓
Runtime / renderer adapters
```

Pixi and Three adapters must not inspect prefab metadata. Missing prefabs keep the last-known baked tree and emit a warning. Nested prefabs resolve with cycle/depth guards.

**MVP limitation:** inherited prefab children cannot be deleted, duplicated, or reparented. Add local children, or Unpack first. Property overrides, Apply/Revert, and regular Unpack are supported.

Script component class instances and functions must never be persisted in scene JSON. See `.cursor/skills/create-game-component/SKILL.md`.
