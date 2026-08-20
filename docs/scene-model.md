# Scene model

Engine-neutral scene graph: nodes, components, Zod validation, and prefabs. Pixi and Three objects are never stored here; adapters in `renderer-pixi` / `renderer-three` map `nodeId` → display objects.

**Status:** shipped. Schema version is `1` (`SCENE_SCHEMA_VERSION`). Prefab instances, property overrides, unpack, and nested resolution are in. Inherited children cannot be deleted, duplicated, or reparented without Unpack first.

Renderers: [`renderers.md`](./renderers.md). Assets: [`assets.md`](./assets.md). Scripts: [Add a script component](./guides/add-a-script-component.md).

---

## Scene files

Editable scenes live next to the game:

```text
games/<name>/assets/scenes/<fileId>.json
```

`<fileId>` is the scene id used by `project.json` `startScene`, Change Scene, and `GameRuntime.loadScene` (e.g. `loading`, `main`). Load/save goes through project-server in the editor; standalone games `import.meta.glob` the JSON and parse it with `parseSceneData`.

Example (trimmed from `games/editor-features-demo/assets/scenes/loading.json`):

```json
{
  "id": "scene_89ecaa39-c734-49b4-b14c-1f627a95551a",
  "name": "loading",
  "version": 1,
  "nodes": [
    {
      "id": "node_227af3f8-374d-4b5f-93b0-95b5c5ef52f2",
      "name": "Container",
      "components": [
        {
          "type": "Transform2D",
          "id": "comp_e152e89f-f4c1-4a02-805e-71470e62bbc3",
          "position": { "x": 0, "y": 0 },
          "rotation": 0,
          "scale": { "x": 1, "y": 1 }
        },
        {
          "type": "Script",
          "id": "comp_5605ec41-37a1-443d-a8c2-a963db614a77",
          "scriptId": "editor-features-demo.LoadingScene",
          "properties": {
            "completeEvent": "loading.complete",
            "nextScene": "main",
            "minDisplayMs": 500
          }
        }
      ],
      "children": []
    }
  ]
}
```

Textures and other files are referenced by catalogue `assetId` (`asset_…`), not by path. Moving an asset updates `AssetDatabase`; scene JSON keeps the same id.

---

## Types

`packages/scene/src/types.ts`:

```ts
interface SceneData {
  id: string;
  name: string;
  version: number;                 // SCENE_SCHEMA_VERSION (1)
  renderer?: "pixi" | "three" | "hybrid";  // omit → "pixi"
  /** Named state catalog (Portrait, Damaged, …). Omit when empty. */
  states?: SceneStateDefinition[];
  nodes: SceneNodeData[];
}

interface SceneNodeData {
  id: string;
  name: string;
  parentId?: string;
  layer?: "background" | "foreground";  // hybrid Pixi stack; ignored for 3D
  visible?: boolean;                    // omit = true; persist false when hidden
  alpha?: number;                       // omit = 1; persist when not fully opaque
  pointerEventMode?: NodePointerEventMode; // omit = "static"; playback only
  cursor?: string;                      // omit = engine default; CSS cursor in playback
  pointerChildren?: boolean;            // omit = true; persist false to block children
  prefab?: PrefabInstanceLink;          // only on prefab-instance nodes
  /** Sparse overrides keyed by catalog state id. Omit when empty. */
  stateOverrides?: Record<string, NodeStateOverrides>;
  components: ComponentData[];
  children: SceneNodeData[];
}
```

Nodes are generic. Behaviour and look come from **components**, not subclasses (`SpriteNode`, `ButtonNode`, …).

```text
Node
├── Transform2D
├── Sprite          (assetId)
├── HitZone         (optional click/touch region)
├── Mask            (optional 2D clip: shape or sprite)
└── Script          (scriptId: shared.Button)
```

A 3D entity is the same idea with `Transform3D` + `Model3D` / lights / camera.

Leaf visuals and leaf Three components cannot have scene children (`nodeCanHaveChildren` in `packages/scene/src/node-capabilities.ts`). Group with a Transform-only container.

**Tilemap** is one node. Cells live in sparse chunks on the component (`EMPTY_TILE = -1`). They are not child nodes. A cell stores a logical tile ID; animation frames are TileSet metadata plus a transient clock — not serialized per frame.

---

## Component types (shipped)

Discriminated union `ComponentData` on `type`:

| `type` | Package file | Notes |
| --- | --- | --- |
| `Transform2D` / `Transform3D` | `types.ts` | Separate structs; 2D has optional `skew`, `anchor` |
| `Sprite`, `NineSliceSprite`, `TilingSprite` | `visual-components.ts` | `assetId` optional (placeholder) |
| `Graphics` | `visual-components.ts` | rect / rounded-rect / circle / ellipse / polygon |
| `Text`, `HTMLText`, `BitmapText` | `visual-components.ts` | webfont `style.fontAssetId` or bitmap `font` asset |
| `Mesh`, `MeshSimple`, `MeshRope`, `MeshPlane`, `PerspectiveMesh` | `visual-components.ts` | |
| `AnimatedSprite` | `visual-components.ts` | frame `assetId`s or Aseprite `assetId` + `animation` tag |
| `Spine` | `visual-components.ts` | skeleton + atlas catalogue id |
| `Tilemap` | `tilemap-data.ts` | `tileSetId` + chunked cells |
| `HitZone` | `hit-zone-component.ts` | Optional 2D pointer region (Graphics shapes + offset). Not a leaf visual, not physics. One per node. |
| `Mask` | `mask-component.ts` | Optional 2D clip (shape or sprite/alpha, optional inverse). Not a leaf visual. One per node. Pixi-only. |
| `Model3D` | `three-components.ts` | glTF `assetId`, clip / loop / playing |
| `PerspectiveCamera`, `DirectionalLight`, `AmbientLight` | `three-components.ts` | |
| `Script` | `types.ts` | `scriptId` + JSON `properties` — no class instances |

Factories: `packages/scene/src/factories/` (`createEmptyScene`, `createSpriteComponent`, `createHitZoneComponent`, `createMaskComponent`, `createScriptComponent`, …). Queries: `findNodeById`, `getTransform2D`, `getVisualComponent`, `getHitZone`, `getMask`, `flattenNodes` in `queries.ts`. Hierarchy mutations: `node-ops.ts` / `hierarchy.ts`.

IDs come from `createId(prefix)` in `@game-editor/shared`: `scene_`, `node_`, `comp_`, `asset_`, `prefab_`, `pinst_` (prefab instance).

---

## Transforms

2D and 3D stay distinct:

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

Rotation/skew in scene data are degrees (engine-neutral). Renderers convert to radians.

---

## Validation

Scene JSON is untrusted input (hand-edits, old files, other branches). `parseSceneData` in `packages/scene/src/schema.ts` runs Zod (`sceneDataSchema`) after `withSceneParseDefaults`. Prefab documents use `parsePrefabData` (`packages/scene/src/prefab/schema.ts`).

`version` is the format version. Incompatible shape changes bump `SCENE_SCHEMA_VERSION` / `PREFAB_SCHEMA_VERSION` and need a migration plus tests in `schema.test.ts` / `prefab.test.ts`. There is no separate migration runner yet (see [`roadmap.md`](./roadmap.md)).

Keep files Git-friendly: deterministic field order from the writer, no Pixi/Three instances, no play-mode clocks or selection.

---

## Visibility, alpha, pointer, and layers

- **`visible`** — runtime/export. Omit when `true`. Inspector **Visible** writes this field (undoable). Hierarchy eye does not.
- **`alpha`** — runtime/export opacity (0–1). Omit when `1`. Inspector **Alpha** writes this field (undoable). Pixi applies it to the node container (children inherit).
- **`pointerEventMode`**, **`cursor`**, **`pointerChildren`** — playback / game runtime pointer behaviour for 2D nodes (Pixi `eventMode`, CSS cursor, whether children are hit-tested). Omit for defaults (`static`, engine cursor, children on). Inspector **Pointer** writes these (undoable). Editor selection still uses grab / static so locked or `none` nodes remain selectable.
- **`layer`** — `"background"` \| `"foreground"` on 2D nodes in a hybrid scene (Pixi under vs over Three). Default `"background"`. Ignored for `Transform3D` nodes.
- **`renderer`** on `SceneData` — `"pixi"` \| `"three"` \| `"hybrid"`. Must match the game’s package dependencies (`project.json` `renderers`).

---

## Node States

Named **property overrides** on nodes (not a state machine). Base values stay on the normal node fields (`Transform2D`, `alpha`, `visible`). How-to: [Use node states](./guides/use-node-states.md). Optional catalog on the scene:

```ts
interface SceneStateDefinition {
  id: string;   // state_… (stable)
  name: string; // display only
  viewport?: { width: number; height: number }; // optional editor guide hint
}
```

Per-node sparse overrides (`packages/scene/src/node-states/`):

```ts
interface NodeStateOverrides {
  visible?: boolean;
  alpha?: number;
  transform2D?: {
    position?: { x?: number; y?: number };
    rotation?: number;
    scale?: { x?: number; y?: number };
  };
}
```

Resolution is always **Base → one active state** via `resolveNodeState`. Unchanged channels are omitted from JSON. Duplicate/clone copies `stateOverrides` (state ids still refer to the scene catalog).

**Prefab interaction:** state data is copied with the node on duplicate/instantiate/unpack. Prefab Apply / Revert does **not** include `stateOverrides` in this milestone (separate from `PrefabOverride`).

MVP properties only — no arbitrary Script/component paths yet. Precedence assumption for later work: Base → State → Animation / live `ctx.transform`.

---

## Prefabs

A prefab is a versioned document whose `root` reuses `SceneNodeData`:

```ts
interface PrefabData {
  version: number; // PREFAB_SCHEMA_VERSION (1)
  id: string;      // prefab_…
  name: string;
  root: SceneNodeData;
}
```

Files: `games/<name>/assets/prefabs/**/*.prefab.json`. Catalogue type is `prefab`; scenes store the catalogue `assetId`, not the path.

Instance link on `SceneNodeData.prefab`:

```ts
interface PrefabInstanceLink {
  prefabAssetId: string;
  instanceId: string;
  sourceNodeId: string;
  componentSources: Record<string, string>; // scene comp id → source comp id
  isRoot?: boolean;
  overrides?: PrefabOverride[];             // property / name / layer / visible / alpha / pointer*
}
```

Source node ids and instance node ids are different; mapping is `sourceNodeId` + `componentSources`.

Resolution (`resolveScenePrefabs` / `resolvePrefabInstance` in `packages/scene/src/prefab/`) is pure domain:

```text
Serialized scene + prefab catalog (assetId → PrefabData)
        ↓
Resolved scene graph
        ↓
GameRuntime / Pixi / Three adapters
```

Adapters must not inspect prefab metadata. Missing prefabs keep the last-known baked tree and emit a warning (`MISSING_PREFAB`). Nested prefabs use cycle and depth guards (`PREFAB_MAX_NESTING_DEPTH = 16`).

**Limitation:** you cannot delete, duplicate, or reparent inherited prefab children. Add local children, or Unpack. Property overrides, Apply/Revert, and Unpack are supported.

---

## Scripts on the scene

Serialized shape:

```ts
interface ScriptComponentData {
  type: "Script";
  id: string;
  scriptId: string;  // e.g. "shared.ChangeScene"
  enabled?: boolean; // omit = true; persist false when the behaviour should not run
  properties: Record<string, unknown>;
}
```

`scriptId` is a registry id, never a file path. Unknown ids still deserialize so old scenes load; the editor warns if the definition is missing. Behaviour **classes and functions are not persisted** — `GameRuntime` / preview construct them from `ComponentRegistry.create` when `enabled` is not `false`.

---

## How to extend

**New visual / 3D component**

1. Add the `type: "…"` interface and union member in `visual-components.ts` or `three-components.ts`.
2. Add the Zod object to `schema.ts` (keep discriminant aligned).
3. Add a factory in `packages/scene/src/factories/`.
4. Teach queries / capabilities if it is a leaf.
5. Implement create/update/destroy in the matching renderer.
6. Register a `NodeTypeDefinition` in `packages/editor-core/src/node-types/` and Inspector fields.
7. Add schema + command tests. Bump `SCENE_SCHEMA_VERSION` only for incompatible changes, with a migration.

**New Script** — do not add a new `ComponentData` variant. Use [Add a script component](./guides/add-a-script-component.md).

---

## Related

- Editor commands and Inspector: [`editor.md`](./editor.md)
- Adapters and node-type status: [`renderers.md`](./renderers.md)
- Runtime load path: [`runtime.md`](./runtime.md)
- Asset ids and generated files: [`assets.md`](./assets.md)
