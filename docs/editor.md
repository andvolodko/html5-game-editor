# Editor

Browser editor: dockable React UI plus `@game-editor/editor-core`, which owns the document, selection, commands, and project I/O.

**Status:** shipped. Layout, undo/redo, Inspector, Asset Browser, prefab edit mode, and tilemap paint are in use. Multi-user locking is not — see [`collaboration.md`](./collaboration.md).

Scene JSON: [`scene-model.md`](./scene-model.md). Shortcuts: [`hotkeys.md`](./hotkeys.md). Script Inspector entries: [Add a script component](./guides/add-a-script-component.md).

---

## How it works

```text
React panels (apps/editor)
        │  read via useEditor / useEditorState
        │  mutate via Editor methods / commands
        ▼
Editor  (packages/editor-core)
  ├── DocumentManager     scene JSON in memory + dirty vs last save
  ├── SelectionManager    node / scene selection (IDs only)
  ├── CommandManager      undo / redo stacks
  ├── AssetManager        catalogue from project-server
  ├── PrefabManager       catalog + scene | prefab document mode
  ├── EditorViewportController  sync SceneRenderer after mutations
  ├── NodeStateEditSession      active named state (Base = null; not scene JSON)
  └── EditorNodeMetadataStore   Hierarchy eye / lock (localStorage)
        │
        ▼
SceneData  →  PixiSceneRenderer / ThreeSceneRenderer
```

`createEditor()` in `apps/editor/src/create-editor.ts` constructs `Editor` with fetch clients on `/api` (Vite proxy → project-server). Demo mode swaps those clients for an in-memory snapshot.

React is a view. Canonical scene trees, transforms, and the asset catalogue live on `Editor`, not in component state.

---

## Where the code lives

| Piece | Path |
| --- | --- |
| Façade | `packages/editor-core/src/editor.ts` |
| Commands | `packages/editor-core/src/commands/` (one class per file, re-exported from `commands/index.ts`) |
| Command contract | `packages/commands` — `Command` / `CommandManager` / `CompositeCommand` |
| Node create menus | `packages/editor-core/src/node-types/` (`pixi.*` / `three.*` IDs) |
| React shell | `apps/editor/src/` — `EditorShell`, `DockLayout`, panels |
| Subscribe hook | `apps/editor/src/hooks/useEditorState.ts` |
| Live factory | `apps/editor/src/create-editor.ts` |

Public API is the `@game-editor/editor-core` barrel. Panels import that package; they do not reach into `src/` of other packages.

---

## `Editor` façade

`Editor` is what UI and hotkeys call. It owns:

| Field | Role |
| --- | --- |
| `document` | Editable `SceneData`. Commands mutate here only. |
| `selection` | `{ kind: "none" \| "scene" \| "nodes" }` — last node id is primary |
| `commands` | Undo/redo history |
| `assets` | Catalogue + import workflows |
| `project` | Open project / `project.json` |
| `components` | Script catalog for Add Component |
| `prefabs` | Prefab catalog + `EditorDocumentMode` |
| `viewport` | Attached `SceneRenderer`s, camera, overlay flags |
| `nodeMetadata` | Editor-only hidden/locked flags |
| `console` | Structured log for the Console panel |
| `tilemapEdit` | Paint/erase stroke session |
| `nodeStates` | Active named state for editing (Base = null; not scene JSON) |

`editor.subscribe` bumps `getStoreVersion()`. `useEditorState(selector)` re-renders panels from that version. Prefer a selector that reads the fields you need rather than copying the whole scene into React state.

Convenience methods (`createSprite`, `setTransform2D`, `saveScene`, …) construct a command and `execute` it. File/catalog ops that hit the network use `executeAsync`.

---

## Commands and undo

User-visible edits go through `Command`:

```ts
interface Command {
  readonly name: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}
```

`CommandManager` keeps `undoStack` / `redoStack` (default max 100). It does not snapshot the whole scene per edit; each command stores before/after for its own mutation.

Example — Inspector **Visible** (serialized runtime flag):

```ts
// packages/editor-core/src/commands/set-node-visible-command.ts
export class SetNodeVisibleCommand implements Command {
  execute(): void {
    this.document.setNodeVisible(this.nodeId, this.after);
  }
  undo(): void {
    this.document.setNodeVisible(this.nodeId, this.before);
  }
}
```

Commands talk to `DocumentManager` / `SelectionManager`. They do not write Pixi/Three objects or React state. Viewport sync happens after the document mutation (`EditorViewportController`).

`CompositeCommand` groups several commands into one undo step and undoes children in reverse order (duplicate selection, multi-node move, nudge).

### Command catalog (common)

| Command | Typical trigger |
| --- | --- |
| `CreateNodeCommand` / `CreateSpriteCommand` / `CreateAnimatedSpriteCommand` / `CreateSpineCommand` / `CreateModel3DCommand` | Hierarchy / viewport / asset drop |
| `DeleteNodeCommand` / `DeleteNodesCommand` | Delete key |
| `DuplicateNodeCommand` / `PasteNodesCommand` | Ctrl+D / Ctrl+V |
| `MoveNodeCommand` | Hierarchy drag |
| `SetTransform2DCommand` / `SetTransform3DCommand` | Gizmo / Inspector commit / viewport drag |
| `SetVisualComponentCommand` / `SetSpriteSizeCommand` | Inspector visual fields / Graphics polygon vertices |
| `AddHitZoneCommand` / `SetHitZoneCommand` | Inspector Hit Zone / viewport HitZone size, move, and polygon vertices |
| `AddMaskCommand` / `SetMaskCommand` | Inspector Mask / viewport Mask size, move, and polygon vertices |
| `SetNodeVisibleCommand` / `SetNodeAlphaCommand` / `SetNodeLayerCommand` / `SetNodePointerCommand` | Inspector |
| `AddSceneStateCommand` / `RenameSceneStateCommand` / `DeleteSceneStateCommand` / `DuplicateSceneStateCommand` / `SetNodeStateOverrideCommand` | States panel / Inspector / gizmos when a named state is active |
| `AddScriptComponentCommand` / `RemoveComponentCommand` / `SetScriptPropertiesCommand` / `SetScriptEnabledCommand` | Inspector scripts / HitZone / Mask remove |
| `InstantiatePrefabCommand` / `UnpackPrefabCommand` / `RevertPrefabOverridesCommand` | Prefab workflows |
| `PaintTilemapCommand` | Tilemap stroke (one command per pointer gesture) |
| `RenameAssetCommand` / `DeleteAssetCommand` / folder variants | Asset Browser |

Adding a command: new file under `packages/editor-core/src/commands/<name>-command.ts`, export from `commands/index.ts`, cover it with a unit test, then optionally add an `Editor` method if the UI needs a one-liner.

---

## Continuous input

Pointer moves are not commands. Drag / paint / numeric scrub:

```text
pointer down  → capture initial value (or start a tilemap stroke)
pointer move  → preview on the renderer (e.g. PixiSceneRenderer.previewNodePosition)
pointer up    → one command with before/after (CompositeCommand when several selected nodes moved)
```

Inspector string/number drafts stay in the input until Enter or blur. TileSet geometry/animation metadata saves through the TileSet document API; advancing an animated tile at runtime is not undoable.

---

## Dirty state

`DocumentManager` compares a stable snapshot of `SceneData` to the last successful save. States: `clean`, `dirty`, `saving`, `save-error`. Leaving a dirty scene is guarded in `apps/editor/src/unsaved/`.

Dirty is not derived from React, and it is not the undo stack length (you can undo back to the saved snapshot).

---

## Selection

`SelectionManager` stores **node ids** (or “the scene document is selected”). It never stores `PIXI.DisplayObject` / `THREE.Object3D`. Clicking an unselected node in the Scene view selects only that node. Ctrl/Cmd-click toggles a node in the selection. Dragging empty 2D space draws a marquee and selects overlapping Transform2D nodes. Dragging an already-selected node translates the whole selection (root-most Transform2D nodes) as one undo step.

Asset Browser selection (`selectedAssetId`, folder, search) is separate UI state. Dropping an asset onto the scene passes an `assetId` in the drag payload and creates a node via a command.

---

## Hierarchy eye / lock vs Inspector Visible

| Control | Persisted? | Undo? | Affects game export? |
| --- | --- | --- | --- |
| Inspector **Visible** (`SceneNodeData.visible`) | Scene JSON (`false` only; omit means visible) | Yes | Yes |
| Hierarchy eye / lock | `localStorage` only | No | No |

Viewport display is `runtimeVisible && !editorHidden`. Preview and standalone builds use only the serialized flag.

Store: `EditorNodeMetadataStore`. Key shape:

```text
game-editor:node-meta:v1:${projectId}:${scene:fileId|prefab:assetId}
```

Effective hide/lock walks ancestors. Hiding a parent does not write flags onto children unless you use the recursive actions (Shift+click, Hide/Lock Children). Viewport applies overlay via `SceneRenderer.setNodeEditorHidden` / `setNodeLocked` without a full rebuild.

---

## Inspector

Inspector is schema-driven where possible:

```text
ComponentData.type / Script definition.properties
        → field renderer (number, string, boolean, enum, vector, color, asset)
        → command on commit
```

| Selection | Panel |
| --- | --- |
| Scene | Name, renderer (`pixi` / `three` / `hybrid`) |
| Node | Visible, alpha, 2D **Pointer** (`pointerEventMode`, `cursor`, `pointerChildren` — playback only) |
| Node visuals | `VisualComponentInspector` + per-type fields under `apps/editor/src/panels/visual-fields/`. Graphics polygons are editable in the Inspector and viewport (same vertex/edge handles as Mask). |
| Hit Zone | `HitZoneInspector` — Add/Remove on Transform2D nodes; not a Script. Polygon vertices are editable in the Inspector and viewport. |
| Mask | `MaskInspector` — Add/Remove on Transform2D nodes; shape or sprite/alpha clip. Not a Script. Viewport handles commit `SetMaskCommand`. |
| Script | `ScriptComponentsInspector` — catalog from `editor.components` |
| Prefab instance | `PrefabInspectorSection` — Apply / Revert / Unpack |

Add Component lists `NodeTypeRegistry` (create node) and the script catalog (`GET /components/catalog` + `installActiveGameRuntime`). Custom inspectors are extra React, not a second scene model.

---

## Prefab edit mode

`PrefabManager` mode is `scene` or `prefab`. Opening an instance root as a prefab stashes the scene snapshot; Save writes the `.prefab.json` asset, not the scene file. After each document command, `PrefabManager.syncOverrides` diffs instances against the catalog so Inspector fields stay generic.

Pixi/Three adapters do not read prefab metadata. Resolution is a domain step (`resolveScenePrefabs`) before render/runtime. See [`scene-model.md`](./scene-model.md#prefabs).

---

## Layout

Docking is `DockLayout` / dockview (`apps/editor/src/layout/`). Layout is UI chrome: it is not scene state. Default arrangement:

```text
┌─────────────────────────────────────────────────────┐
│ Toolbar                                             │
├────────────┬──────────────────────────┬─────────────┤
│ Hierarchy  │ Scene viewport           │ Inspector   │
│            │                          │ Asset Preview│
├────────────┼──────────────────────────┤             │
│ Assets     │ Preview / Console / States│            │
└────────────┴──────────────────────────┴─────────────┘
```

### Node States panel

Dockable **States** panel (`EDITOR_PANEL_IDS.states`), tabbed with Console by default. Selects the editor-only active state (`NodeStateEditSession` — not written into scene JSON). While a named state is active, Inspector and Transform2D gizmos write sparse `stateOverrides` instead of Base. Inspector shows effective values and a reset control on overridden MVP fields. How-to: [Use node states](./guides/use-node-states.md).

Pixi and Three are used in the scene viewport (and game Preview). Standard chrome stays DOM/React. Preview Play / Pause / Stop drives an isolated `GameRuntime`; Pause freezes scripts, input, audio, and playback animation without writing into the open document. Inspector Script property edits still reach the live preview via `onPropertiesChanged`.

---

## How to extend

1. **New undoable edit** — command class → `DocumentManager` mutator if needed → `Editor` method or panel call → test in `packages/editor-core/src/`.
2. **New creatable node type** — domain factory + Zod in `@game-editor/scene`, renderer adapter, then `NodeTypeDefinition` in `node-types/`.
3. **New Script in Add Component** — [Add a script component](./guides/add-a-script-component.md).
4. **New Inspector field** — prefer component schema/`properties`; add a field renderer only when the control is unique.

Keep one completed gesture as one undo entry. If the change alters persisted JSON, update Zod and tests in `@game-editor/scene` in the same slice.

---

## Related

- Scene schema and prefabs: [`scene-model.md`](./scene-model.md)
- Runtime preview vs standalone: [`runtime.md`](./runtime.md)
- Adapters: [`renderers.md`](./renderers.md)
- Keyboard: [`hotkeys.md`](./hotkeys.md)
