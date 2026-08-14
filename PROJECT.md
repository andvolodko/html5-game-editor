# Project: Hybrid 2D/3D Web Game Editor

## 1. Project Vision

Build a professional browser-based game editor and runtime framework for creating multiple HTML5 games using:

* PixiJS for 2D rendering.
* Three.js for 3D rendering.
* React for editor UI.
* TypeScript across the entire codebase.
* Node.js for filesystem access, project management, asset processing and collaboration services.
* pnpm workspaces as the monorepo solution.
* Vite for browser applications and game builds.

The editor should conceptually resemble a lightweight Unity/Cocos-style workflow focused specifically on HTML5 games.

The project must prioritize:

1. clean architecture;
2. modularity;
3. editor/runtime separation;
4. deterministic scene serialization;
5. high testability;
6. multiple games using the same engine;
7. designer-friendly workflows;
8. extensibility;
9. production performance;
10. maintainability by both humans and AI coding agents.

Do not optimize architecture for the shortest implementation.

Prefer designs that remain understandable and extensible as the editor grows.

---

# 2. Core Principles

## 2.1 Editor and Runtime Must Be Separate

The runtime must NEVER depend on editor code.

Valid:

```text
Editor
   ↓
Scene Model
   ↓
Runtime
   ↓
Pixi / Three
```

Invalid:

```text
Game Runtime
   ↓
Editor
```

Games must be deployable without any editor dependencies.

---

## 2.2 Scene Data Must Not Depend Directly on PixiJS or Three.js

The serialized scene model is engine-neutral.

Never store instances such as:

```ts
PIXI.Sprite
THREE.Mesh
```

inside the scene domain model.

Instead use serializable data/components.

Example:

```ts
interface SceneNodeData {
  id: string;
  name: string;
  components: ComponentData[];
  children: SceneNodeData[];
}
```

Renderer adapters translate scene data into PixiJS or Three.js runtime objects.

---

## 2.3 Stable IDs

Every persistent entity must have a stable ID.

Examples:

* assets;
* scene nodes;
* components;
* prefabs;
* scenes.

Scenes must reference assets using `assetId`, not filesystem paths.

Preferred:

```json
{
  "texture": "asset_42"
}
```

Avoid:

```json
{
  "texture": "../../assets/ui/button.png"
}
```

Moving or renaming an asset must therefore not invalidate scenes.

---

# 3. Monorepo Structure

Use pnpm workspaces.

Recommended structure:

```text
/
├── apps/
│   ├── editor/
│   └── project-server/
│
├── packages/
│   ├── core/
│   ├── scene/
│   ├── assets/
│   ├── commands/
│   ├── renderer-pixi/
│   ├── renderer-three/
│   ├── runtime/
│   ├── collaboration/
│   ├── editor-core/
│   └── shared/
│
├── games/
│   ├── editor-features-demo/
│   ├── game-two/
│   └── game-three/
│
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

Workspace definition:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "games/*"
```

Internal packages must use workspace dependencies:

```json
{
  "@game-editor/core": "workspace:*"
}
```

---

# 4. Dependency Direction

Dependencies should flow inward toward domain/core abstractions.

Preferred:

```text
scene
assets
commands
   ↑
editor-core
   ↑
editor UI
```

Rendering:

```text
core
 ↑  ↑
 │  │
Pixi Three
  \ /
runtime
```

Avoid cyclic dependencies.

A lower-level package must not import from a higher-level application package.

---

# 5. Applications

## apps/editor

Browser-based visual editor.

Technology:

* React;
* TypeScript;
* Vite;
* docking-layout library;
* PixiJS viewport;
* Three.js viewport.

Responsibilities:

* hierarchy panel;
* scene viewport;
* asset browser;
* inspector;
* toolbar;
* console;
* preview;
* tabs;
* docking layout;
* drag-and-drop;
* keyboard shortcuts;
* command execution;
* scene editing.

Editor UI should remain primarily DOM/React based.

Do not render standard editor UI using PixiJS.

PixiJS and Three.js should be used only where a graphical viewport is required.

---

## apps/project-server

Node.js server used by the browser editor.

Responsibilities:

* project filesystem;
* asset import;
* asset deletion/move/rename;
* scene loading/saving;
* asset processing;
* spritesheet generation;
* Aseprite / LibreSprite compile (editor-only CLI);
* file watching;
* collaboration;
* resource locking;
* project discovery;
* build orchestration where necessary.

The browser must never receive arbitrary unrestricted filesystem access.

All filesystem paths must be validated relative to the opened project root.

Prevent path traversal.

---

# 6. Editor Layout

Target layout:

```text
┌─────────────────────────────────────────────────────┐
│ Toolbar                                             │
├────────────┬──────────────────────────┬─────────────┤
│ Hierarchy  │ Scene                    │ Inspector   │
│            │                          │             │
│            │                          │             │
├────────────┼──────────────────────────┤             │
│ Assets     │ Preview / Console        │             │
│            │                          │             │
└────────────┴──────────────────────────┴─────────────┘
```

Panels should support:

* resizing;
* tabs;
* docking;
* moving;
* hiding;
* reopening;
* persisted layout.

Possible panels:

* Hierarchy;
* Scene;
* Assets;
* Inspector;
* Game Preview;
* Console;
* Timeline;
* Animation;
* Atlas Preview.

Panel implementations must remain modular.

---

# 7. Scene Architecture

A scene contains nodes.

Example:

```ts
interface SceneData {
  id: string;
  name: string;
  version: number;
  nodes: SceneNodeData[];
}
```

Recommended node model:

```ts
interface SceneNodeData {
  id: string;
  name: string;

  parentId?: string;

  components: ComponentData[];

  children: SceneNodeData[];
}
```

Avoid creating large inheritance trees such as:

```text
Node
├── SpriteNode
├── ThreeMeshNode
├── TextNode
├── ButtonNode
├── AnimatedNode
...
```

Prefer composition using components.

---

# 8. Component Architecture

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

Example components:

```text
Transform2D
Transform3D
Sprite
Text
Spine
Model3D
Camera3D
Camera2D
Light3D
Animator
AudioSource
Button
ParticleEmitter
Layout
```

Components must contain serializable data.

Runtime-specific objects must live outside serialized component data.

---

# 9. Transform Components

## Transform2D

```ts
interface Transform2D {
  position: {
    x: number;
    y: number;
  };

  rotation: number;

  scale: {
    x: number;
    y: number;
  };

  anchor?: {
    x: number;
    y: number;
  };
}
```

## Transform3D

```ts
interface Transform3D {
  position: {
    x: number;
    y: number;
    z: number;
  };

  rotation: {
    x: number;
    y: number;
    z: number;
  };

  scale: {
    x: number;
    y: number;
    z: number;
  };
}
```

Do not force 2D and 3D transforms into the same structure merely to reduce type count.

---

# 10. Renderer Architecture

Rendering must be adapter-based.

Define an abstraction approximately like:

```ts
interface SceneRenderer {
  createNode(node: SceneNodeData): void;
  updateNode(node: SceneNodeData): void;
  destroyNode(nodeId: string): void;

  resize(width: number, height: number): void;

  render(): void;
}
```

Implementations:

```text
PixiSceneRenderer
ThreeSceneRenderer
```

Runtime object mappings should live inside renderer/runtime layers.

For example:

```text
sceneNodeId
   ↓
PIXI.DisplayObject
```

or:

```text
sceneNodeId
   ↓
THREE.Object3D
```

---

# 11. Hybrid PixiJS + Three.js Rendering

A scene may contain both 2D and 3D content.

The architecture must support renderer layers.

Example:

```text
Layer 200 → Pixi UI
Layer 100 → Three 3D world
Layer   0 → Pixi background
```

Define something conceptually similar to:

```ts
interface RenderLayer {
  id: string;
  renderer: "pixi" | "three";
  order: number;
}
```

For the first implementation it is acceptable to use multiple stacked canvases.

Example:

```text
Canvas 3 → Pixi foreground/UI
Canvas 2 → Three world
Canvas 1 → Pixi background
```

Do not tightly couple scene logic to the number of canvases.

Canvas composition is a renderer implementation detail.

---

# 12. Three.js Support

Initial supported 3D resources:

* GLB;
* GLTF;
* textures;
* HDR environments.

Initial supported Three components:

* Transform3D;
* Model3D;
* PerspectiveCamera;
* DirectionalLight;
* AmbientLight.

Future compatibility should allow:

* animation;
* materials;
* particles;
* shadows;
* post-processing;
* physics;
* navigation;
* instancing.

Do not implement all future systems prematurely.

Design extension points instead.

---

# 13. PixiJS Support

Installed runtime: **pixi.js@8.19.0** (see `@game-editor/renderer-pixi`).

Initial supported resources:

* PNG;
* JPG;
* WebP;
* spritesheets;
* Aseprite / LibreSprite (`.aseprite`, `.ase`) compiled to PNG + Pixi JSON;
* fonts;
* audio metadata where appropriate.

## Supported Pixi node types

| Type | Status | Notes |
| --- | --- | --- |
| Container | Supported | Transform2D-only grouping; `canHaveChildren` |
| Sprite | Supported | Texture or Aseprite `assetId` + display size |
| NineSliceSprite | Supported | |
| TilingSprite | Supported | |
| Graphics | Supported | MVP shapes: rect / rounded-rect / circle / ellipse / polygon |
| Text | Supported | Common TextStyle subset |
| BitmapText | Supported | Font assets not imported yet; unassigned font → placeholder |
| HTMLText | Supported | |
| Mesh | Supported | Default textured quad (no custom shader editor) |
| MeshSimple | Supported | |
| MeshRope | Supported | |
| MeshPlane | Supported | |
| PerspectiveMesh | Supported | Corner positions in Inspector |
| AnimatedSprite | Supported | Frames as assetId[], or Aseprite `assetId` + `animation` tag; play/loop/speed |
| Spine | Supported | Bundled skeleton+atlas+pages; Pixi playback via `@esotericsoftware/spine-pixi-v8` |
| ParticleContainer | Deferred | Pixi Particle API accepts Particle children only — incompatible with Container hierarchy |

Node creation is driven by `NodeTypeRegistry` (`pixi.*` stable IDs). Menus and `CreateNodeCommand` share that registry. Leaf visuals cannot receive scene children (domain `canMoveNode` / create-parent policy).

Future compatibility:

* particles / ParticleContainer (experimental);
* masks;
* filters;
* bitmap font asset importer;
* custom shaders;
* visual mesh vertex editor.

---

# 14. Asset Database

Assets must be represented by metadata.

Example:

```ts
interface AssetRecord {
  id: string;
  type: AssetType;
  path: string;
  name: string;
  metadata?: Record<string, unknown>;
}
```

Possible asset types:

```text
texture
spritesheet
aseprite
model3d
audio
font
spine
environment
scene
prefab
```

`aseprite` records point at the source `.aseprite` / `.ase` path. Derived PNG/JSON live under `.generated/` and are not catalogue entries. Scenes must store the Aseprite `assetId` (and optional tag `animation`), never a generated filesystem path. See `docs/aseprite.md`.

Asset IDs remain stable after:

* rename;
* move;
* asset folder restructuring.

Scenes reference IDs.

---

# 15. Asset Browser

Asset Browser should behave like a simplified file explorer.

Features:

* folders;
* search;
* multi-selection;
* rename;
* delete;
* duplicate;
* move;
* context menu;
* drag-and-drop;
* create folder;
* preview.

External OS files may be dropped into the browser.

Flow:

```text
OS File Explorer
      ↓
Browser Editor
      ↓
Project Server
      ↓
Asset Import Pipeline
      ↓
Asset Database
```

Never trust filenames or paths received from the browser.

---

# 16. Drag Assets Into Scene

An asset can be dragged from Asset Browser to Scene View.

Examples:

```text
PNG/WebP
   ↓
Sprite component
```

```text
GLB/GLTF
   ↓
Model3D component
```

```text
.aseprite / .ase
   ↓
Sprite (one frame) or AnimatedSprite (tags / multiple frames)
```

The browser drag payload should pass an `assetId`.

Do not transfer large asset data through drag metadata.

Drop coordinates must be converted from viewport coordinates into scene/world coordinates.

Creating an object through drag-and-drop MUST use the command system so it can be undone.

---

# 17. Asset Import Pipeline

Architecture:

```text
Raw Asset
   ↓
Importer
   ↓
Asset Metadata
   ↓
Processor
   ↓
Runtime Asset
```

Each importer should be extensible.

Concept:

```ts
interface AssetImporter {
  supports(file: ImportFile): boolean;
  import(file: ImportFile): Promise<AssetRecord>;
}
```

Possible importers:

```text
TextureImporter
ModelImporter
AudioImporter
FontImporter
SpineImporter
AsepriteAssetImporter
```

Shipping a game that uses the Spine runtime requires a Spine Editor license (Esoteric Software). The importer does not gate on that license.

Aseprite compile is an **editor/build-time** dependency. Detect `aseprite` or the free `libresprite` CLI behind `AsepriteService` (PATH, `ASEPRITE` env, well-known install folders). Do not call `child_process` from the Assets UI. Missing CLI must not crash the editor. Games ship only generated PNG/JSON; players do not need Aseprite. Details: `docs/aseprite.md`.

---

# 18. Spritesheet / Atlas Pipeline

Aseprite / LibreSprite sources already compile incrementally to a packed PNG + Pixi spritesheet JSON (tags → `spritesheet.animations`). That path is documented in `docs/aseprite.md`.

Users must still be able to build spritesheets from multiple loose source textures.

Configuration should support:

Configuration should support:

```ts
interface AtlasConfig {
  name: string;

  include: string[];
  exclude?: string[];

  maxWidth?: number;
  maxHeight?: number;

  padding?: number;

  trim?: boolean;
  rotate?: boolean;

  powerOfTwo?: boolean;

  format?: "png" | "webp";

  scale?: number;
}
```

Example:

```json
{
  "name": "symbols",
  "include": ["assets/symbols/*.png"],
  "maxWidth": 2048,
  "maxHeight": 2048,
  "padding": 2,
  "trim": true,
  "rotate": false,
  "format": "webp"
}
```

Atlas builder requirements:

* deterministic output where possible;
* incremental rebuild;
* file hashing;
* preview;
* multiple pages if atlas exceeds maximum dimensions.

Example output:

```text
symbols-0.webp
symbols-0.json

symbols-1.webp
symbols-1.json
```

Runtime code must not care which physical atlas contains a logical asset.

---

# 19. Undo / Redo

Undo/redo is mandatory.

Use Command Pattern.

Do not implement undo by serializing the entire scene for every operation.

Base interface:

```ts
interface Command {
  execute(): void;
  undo(): void;
}
```

Command manager:

```text
undoStack
redoStack
```

All user-editing operations should eventually go through commands.

Examples:

```text
CreateNodeCommand
DeleteNodeCommand
MoveNodeCommand
ReparentNodeCommand
SetPropertyCommand
AddComponentCommand
RemoveComponentCommand
DuplicateNodeCommand
CompositeCommand
```

---

# 20. Continuous Input Rules

Do not create one command per mouse-move event.

For transform dragging:

```text
pointer down
   ↓
capture initial value

pointer move
   ↓
preview transient values

pointer up
   ↓
create one command
```

One drag should equal one undo action.

Similarly, text/numeric editing should avoid generating meaningless undo entries for every keystroke.

Use commit semantics such as:

* Enter;
* blur;
* interaction end;
* controlled transaction.

---

# 21. Composite Commands

Operations containing multiple internal changes should appear as one user action.

Example:

```text
Duplicate 15 objects
```

should result in one undo entry.

Composite commands must undo child commands in reverse order.

---

# 22. Scene Dirty State

Scene modifications must track whether unsaved changes exist.

Avoid deriving this solely from React component state.

Command/history or document revision state should be responsible.

Example states:

```text
clean
dirty
saving
save-error
```

---

# 23. Collaboration

The editor should support multiple users working on the same project.

Initial collaboration model:

* shared Git repository;
* separate local checkouts;
* granular scene/prefab files;
* optional resource locking.

Do NOT initially attempt Google-Docs-style real-time CRDT editing.

---

# 24. Resource Locking

Locks are advisory/editor-enforced resource locks.

Possible resources:

```text
scene:game
scene:bonus
prefab:paytable
atlas:ui
```

A lock stores approximately:

```ts
interface ResourceLock {
  resourceId: string;
  userId: string;
  acquiredAt: number;
  expiresAt: number;
}
```

Flow:

```text
Open resource for editing
       ↓
Acquire lock
       ↓
Editing enabled
```

If another user holds the lock:

```text
Open resource
      ↓
Read-only mode
```

---

# 25. Lock Heartbeat

Locks must expire automatically.

The client periodically renews active locks.

Example:

```text
heartbeat every ~10 seconds
lock TTL ~30 seconds
```

Exact values should be configurable.

If the editor crashes or network connection disappears, stale locks must eventually expire.

Lock operations:

```text
acquire
renew
release
query
```

The server must validate lock ownership when modifying locked resources.

---

# 26. Git Collaboration

Resource locking does not replace Git.

Git remains responsible for:

* history;
* branches;
* commits;
* merges;
* revert;
* collaboration source of truth.

Locks only reduce simultaneous modification conflicts.

Scene JSON should be deterministic and human-diff-friendly.

Avoid unnecessary property reordering.

Avoid storing generated/transient state in scene files.

---

# 27. Prefabs

Architecture must allow prefabs later.

A prefab should be a reusable serialized node hierarchy.

Example:

```text
prefabs/
├── spin-button.prefab.json
├── paytable.prefab.json
└── character.prefab.json
```

Prefab design should eventually support:

* instances;
* overrides;
* nested prefabs.

Do not implement complex prefab inheritance in MVP unless explicitly requested.

---

# 28. Inspector

Inspector should be driven by component schemas/metadata whenever practical.

Avoid hardcoding every component's entire UI directly into one giant component.

Desired direction:

```text
Component definition
      ↓
Property metadata
      ↓
Inspector field renderer
```

Example property editors:

```text
number
string
boolean
enum
vector2
vector3
color
asset-reference
```

Custom inspectors should remain possible.

---

# 29. Editor Selection

Selection belongs to editor state, not scene serialization.

Possible states:

```text
no selection
single selection
multi-selection
```

Selection should use stable node IDs.

Never store selected Pixi/Three runtime objects as the canonical selection state.

---

# 30. Editor Core

Business logic must not be hidden inside React components.

Use a dedicated editor-core layer.

Example:

```text
editor-core/
├── Editor.ts
├── SelectionManager.ts
├── DocumentManager.ts
├── CommandManager.ts
├── AssetManager.ts
├── ProjectManager.ts
└── events/
```

React components should primarily:

1. read editor state;
2. render UI;
3. dispatch actions/commands.

---

# 31. Events

Prefer explicit typed events for loosely coupled editor systems.

Avoid uncontrolled global event buses.

Event names and payloads must be typed.

Example:

```ts
interface EditorEvents {
  "selection.changed": {
    nodeIds: string[];
  };

  "scene.changed": {
    sceneId: string;
  };
}
```

Do not use stringly typed event payloads without compile-time types.

---

# 32. Runtime

Games use runtime packages without editor dependencies.

Game package:

```text
games/editor-features-demo/
├── src/
├── assets/
│   └── scenes/
├── project.json
├── package.json
└── vite.config.ts
```

Each game is independently buildable.

Example dependency:

```json
{
  "@game-editor/runtime": "workspace:*"
}
```

---

# 33. Game Builds

Each game owns its own Vite build.

Example:

```bash
pnpm --filter @games/editor-features-demo build
```

Output:

```text
games/editor-features-demo/dist/
```

Building one game must not bundle another game.

The monorepo does NOT produce one global game bundle.

---

# 34. Optional Renderer Dependencies

Games that do not use Three.js should not have to ship Three.js.

Architecture should allow:

```text
Game A
├── core
└── renderer-pixi
```

and:

```text
Game B
├── core
├── renderer-pixi
└── renderer-three
```

Avoid static imports that force optional renderers into every production bundle.

Prefer explicit renderer registration or compatible lazy-loading mechanisms.

---

# 35. Build Commands

Root-level scripts should eventually expose commands similar to:

```text
pnpm dev
pnpm dev:editor
pnpm build
pnpm build:games
pnpm test
pnpm lint
pnpm typecheck
```

Every workspace package should expose only meaningful scripts.

---

# 36. TypeScript

TypeScript strict mode is mandatory.

Avoid:

```ts
any
```

unless there is a documented integration boundary requiring it.

Prefer:

```ts
unknown
```

followed by validation/narrowing.

Public APIs must have explicit types.

Avoid unnecessary type assertions.

Prefer discriminated unions where appropriate.

Example:

```ts
type ComponentData =
  | SpriteComponentData
  | Model3DComponentData
  | Transform2DComponentData
  | Transform3DComponentData;
```

---

# 37. Runtime Validation

Serialized JSON is external input and must be validated.

Do not assume a JSON file matches TypeScript interfaces simply because it was generated by the editor.

Scene/project/asset metadata should have runtime schema validation.

Schema migration must be possible.

---

# 38. Serialization Versions

Persisted formats should contain a format/schema version.

Example:

```json
{
  "version": 1
}
```

Future incompatible changes must be handled through migrations.

Never silently reinterpret old persisted structures.

---

# 39. Error Handling

Do not swallow errors.

Bad:

```ts
try {
  await save();
} catch {}
```

Prefer typed/domain errors where useful.

Editor operations that may fail should surface meaningful messages.

Filesystem and asset pipeline failures must include enough context for diagnosis.

---

# 40. Logging

Use structured logging where appropriate.

Useful categories:

```text
editor
scene
asset
renderer
build
collaboration
filesystem
```

Do not leave uncontrolled `console.log` calls across production code.

The editor Console panel may consume structured editor/runtime logs.

---

# 41. Testing Strategy

Tests are required for core systems.

Prioritize unit tests for:

* command manager;
* undo/redo;
* scene serialization;
* scene migration;
* asset references;
* resource locks;
* asset metadata;
* atlas configuration;
* coordinate transformations where practical.

Use integration tests for:

* filesystem project operations;
* asset imports;
* scene loading/saving;
* collaboration server;
* atlas generation.

UI tests should focus on valuable workflows rather than implementation details.

---

# 42. Code Quality

Prefer:

* small focused classes/modules;
* dependency injection where it genuinely reduces coupling;
* explicit dependencies;
* composition;
* pure functions for transformations;
* deterministic behavior.

Avoid:

* god classes;
* static global service registries;
* hidden singleton state;
* deep inheritance;
* circular dependencies;
* duplicated domain models;
* large React components containing business logic.

---

# 43. Naming

Names should express domain intent.

Good:

```text
SceneDocument
CommandManager
AssetDatabase
ResourceLockService
PixiSceneRenderer
ThreeSceneRenderer
```

Avoid vague names:

```text
Manager
Helper
Utils
Data
Thing
Stuff
```

Generic utility modules should be narrowly scoped.

---

# 44. Files

Prefer one major concept per file.

Do not produce hundreds of tiny files for trivial abstractions.

Balance modularity with navigability.

Keep package public APIs explicit through barrel files where useful.

Avoid unrestricted barrel imports that create dependency cycles.

---

# 45. Dependency Policy

Before introducing a new dependency:

1. verify that it solves a real problem;
2. check whether the functionality is already available;
3. evaluate bundle impact for runtime dependencies;
4. avoid overlapping libraries solving the same problem.

Editor-only dependency size is less critical than game runtime dependency size.

Runtime bundle size must remain a first-class consideration.

---

# 46. Performance

Do not optimize blindly.

However, architecture should avoid obvious production problems.

Examples:

* no React re-render on every Pixi ticker frame;
* do not serialize entire scenes every frame;
* avoid rebuilding asset indexes unnecessarily;
* use incremental asset processing;
* use dirty/update flags where useful;
* avoid unnecessary Pixi/Three object recreation.

Use profiling before complicated optimization.

---

# 47. Security

The project server handles filesystem operations and therefore must treat browser input as untrusted.

Required:

* normalize paths;
* constrain operations to project root;
* block path traversal;
* validate uploads;
* sanitize filenames as necessary;
* avoid arbitrary command execution endpoints.

Never expose a generic API such as:

```text
POST /execute-shell-command
```

to the editor frontend.

---

# 48. Generated Files

Generated assets must be clearly separated from source assets when practical.

Established convention:

```text
assets/                         # source (including .aseprite)
.generated/                     # derived PNG/JSON (mirrors source path)
.project/aseprite-cache.json    # compile skip cache (mtime + size)
```

Example: `assets/characters/hero.aseprite` → `.generated/assets/characters/hero.png` and `hero.json`.

Do not invent a second generated-folder convention.

Do not manually edit generated files.

Derived PNG/JSON under `games/<name>/.generated` are committed so GitHub Actions can build the static demo and standalone games without the Aseprite CLI. Keep `.project/aseprite-cache.json` and `.generated` undo trash gitignored. After changing a source `.aseprite`, regenerate locally and commit the matching PNG/JSON. Game Vite copies `.generated` into the production `dist`; the editor demo plugin copies it under `/demo/<id>/.generated`.

---

# 49. MVP Scope

Do not attempt to implement the entire final editor at once.

Recommended order:

## Phase 1 — Foundation

* pnpm monorepo;
* editor app;
* project server;
* scene model;
* asset model;
* command manager;
* Pixi renderer.

## Phase 2 — Basic Editor

* docking layout;
* hierarchy;
* scene viewport;
* inspector;
* asset browser;
* save/load scene;
* undo/redo.

## Phase 3 — Asset Workflow

* OS drag/drop;
* asset import;
* scene drag/drop;
* asset IDs;
* asset metadata;
* spritesheet generation (Aseprite / LibreSprite compile implemented; multi-PNG atlas still open).

## Phase 4 — Three.js

* Three renderer;
* GLB import;
* Transform3D;
* camera;
* lights;
* hybrid render layers.

## Phase 5 — Collaboration

* project users;
* resource locks;
* heartbeat;
* read-only locked scenes;
* Git-friendly scene files.

## Phase 6 — Advanced Editor

* prefabs;
* animation;
* custom inspectors;
* layout persistence;
* richer asset processing.

---

# 50. AI Implementation Workflow

When implementing a non-trivial feature:

1. inspect existing architecture;
2. identify affected packages;
3. write a short implementation plan;
4. identify public API changes;
5. identify serialization changes;
6. identify undo/redo implications;
7. identify editor/runtime boundaries;
8. identify tests;
9. implement;
10. run typecheck;
11. run tests;
12. run lint;
13. review for architecture violations.

Do not immediately start generating files for architectural tasks without first understanding existing code.

---

# 51. AI Rules for Modifications

Before adding a new abstraction, search the repository for an existing equivalent.

Before adding a dependency, inspect current dependencies.

Before changing serialized data:

* consider backward compatibility;
* update schema;
* update migration if necessary;
* update tests.

Before adding an editor mutation:

* decide whether it must support undo/redo.

Before adding a runtime feature:

* make sure it does not import editor code.

Before adding renderer-specific behavior:

* keep renderer-specific types out of the domain scene model.

Before adding filesystem behavior:

* ensure paths remain confined to project root.

---

# 52. Definition of Done

A feature is not complete merely because it visually works.

For a non-trivial feature, completion means as applicable:

* architecture is consistent;
* types compile;
* lint passes;
* tests pass;
* undo/redo works;
* save/load works;
* errors are handled;
* serialized format remains valid;
* no editor dependency leaked into runtime;
* no unnecessary renderer dependency leaked into game bundle;
* relevant documentation is updated.

---

# 53. Important Architectural Invariants

These rules must never be violated without an explicit architectural decision:

1. Runtime never depends on editor.
2. Scene model never stores PixiJS or Three.js instances.
3. Persisted asset references use stable IDs.
4. Editor mutations use commands when undoable.
5. Browser filesystem access goes through project-server.
6. A game's build is independent from other games.
7. Optional renderers should remain optional in game bundles.
8. Serialization is versioned.
9. Scene files should remain Git-friendly.
10. React UI is not the source of truth for domain data.

When an implementation request conflicts with one of these invariants, stop and propose an alternative design rather than silently violating it.
