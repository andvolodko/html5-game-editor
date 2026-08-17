# Editor

Editor application, layout, commands, selection, inspector, and editor-core.

Orientation: [`PROJECT.md`](../PROJECT.md). Command file layout: `.cursor/rules/editor-commands.mdc`. React vs core: `.cursor/rules/editor-ui.mdc`. Feature workflow: `.cursor/skills/implement-editor-feature/SKILL.md`.

---

## apps/editor

Browser-based visual editor: React, TypeScript, Vite, docking layout, PixiJS viewport, Three.js viewport.

Responsibilities: hierarchy, scene viewport, asset browser, inspector, toolbar, console, preview, tabs, docking layout, drag-and-drop, keyboard shortcuts, command execution, scene editing.

Editor UI should remain primarily DOM/React based. Do not render standard editor UI using PixiJS. PixiJS and Three.js should be used only where a graphical viewport is required.

---

## Layout

Target layout:

```text
┌─────────────────────────────────────────────────────┐
│ Toolbar                                             │
├────────────┬──────────────────────────┬─────────────┤
│ Hierarchy  │ Scene                    │ Inspector   │
│            │                          │             │
├────────────┼──────────────────────────┤             │
│ Assets     │ Preview / Console        │             │
└────────────┴──────────────────────────┴─────────────┘
```

Panels should support resizing, tabs, docking, moving, hiding, reopening, and persisted layout.

Possible panels: Hierarchy, Scene, Assets, Inspector, Game Preview, Console, Timeline, Animation, Atlas Preview.

Panel implementations must remain modular. Docking (`DockLayout` / dockview) is layout-only; it must not become domain state.

Keyboard shortcuts: [`hotkeys.md`](./hotkeys.md).

---

## Editor core

Business logic must not be hidden inside React components. Use `@game-editor/editor-core`.

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

React components should primarily: read editor state, render UI, dispatch actions/commands. React vs `editor-core` constraints: `.cursor/rules/editor-ui.mdc`.

---

## Undo / redo

Undo/redo is mandatory. Use the Command Pattern. Do not implement undo by serializing the entire scene for every operation.

```ts
interface Command {
  execute(): void;
  undo(): void;
}
```

Command manager: `undoStack` / `redoStack`. All user-editing operations should eventually go through commands.

Examples: `CreateNodeCommand`, `DeleteNodeCommand`, `MoveNodeCommand`, `ReparentNodeCommand`, `SetPropertyCommand`, `AddComponentCommand`, `RemoveComponentCommand`, `DuplicateNodeCommand`, `InstantiatePrefabCommand`, `UnpackPrefabCommand`, `RevertPrefabOverridesCommand`, `CompositeCommand`.

Prefab instance roots can be opened as an isolated document (`EditorDocumentMode` `scene` | `prefab`). Save in prefab mode writes the prefab asset, not the stashed scene. After each document command, `PrefabManager.syncOverrides` diffs instances against the catalog so Inspector fields stay generic.

Commands implement `Command` from `@game-editor/commands` and mutate through `DocumentManager` / `SelectionManager` — never Pixi/Three objects or React state. One command class per file under `packages/editor-core/src/commands/`.

---

## Continuous input

Do not create one command per mouse-move event.

For transform dragging:

```text
pointer down  → capture initial value
pointer move  → preview transient values
pointer up    → create one command
```

One drag should equal one undo action. Text/numeric editing should avoid an undo entry per keystroke. Use commit semantics: Enter, blur, interaction end, or a controlled transaction.

Tilemap paint/erase uses the same rule: one pointer stroke collects changed cells (`before`/`after`) and records a single `PaintTilemapCommand`. Do not push a command per cell.

TileSet geometry and animation metadata are saved through the TileSet document API (same path as tile width / source texture). Runtime animation frame advancement is not an undoable command.

Inspector drafts (string inputs) are UI-only until blur/Enter commits a command.

---

## Composite commands

Operations containing multiple internal changes should appear as one user action. Example: duplicating 15 objects is one undo entry. Composite commands must undo child commands in reverse order.

---

## Scene dirty state

Scene modifications must track whether unsaved changes exist. Avoid deriving this solely from React component state. Command/history or document revision state is responsible.

Example states: `clean`, `dirty`, `saving`, `save-error`.

---

## Editor node metadata (visibility / lock)

Hierarchy eye and lock controls are **editor-only**. They are not stored on `SceneNodeData` and are omitted from scene save/export.

Inspector **Visible** is the serialized runtime/export flag (`SceneNodeData.visible`; omit when `true`, persist `visible: false` when hidden). It is undoable and dirties the scene. Hierarchy eye does not write this field.

Viewport display is `runtimeVisible && !editorHidden`. Game preview and export use only the serialized flag.

State lives in `EditorNodeMetadataStore` (`packages/editor-core`) and is persisted to `localStorage` under:

```text
game-editor:node-meta:v1:${projectId}:${scene:fileId|prefab:assetId}
```

Missing keys default to visible and unlocked. Stale node ids are ignored and pruned after document commands.

**Effective** hidden/locked walks ancestors. Hiding or locking a parent does **not** write flags onto children. Explicit recursive actions (Shift+click, Hide/Lock Children) do write descendant flags.

These operations are **not** on the undo stack: commands mutate the scene document and dirty state; editor metadata is session UI state in localStorage.

Viewport sync uses `SceneRenderer.setNodeEditorHidden` / `setNodeLocked` on existing display objects (no full Pixi/Three rebuild). Serialized `node.visible` is applied on create/update.

---

Inspector should be driven by component schemas/metadata whenever practical. Avoid hardcoding every component’s entire UI into one giant component.

```text
Component definition → Property metadata → Inspector field renderer
```

Example property editors: `number`, `string`, `boolean`, `enum`, `vector2`, `vector3`, `color`, `asset-reference`. Custom inspectors should remain possible.

---

## Selection

Selection belongs to editor state, not scene serialization. Possible states: no selection, single selection, multi-selection.

Selection should use stable node IDs. Never store selected Pixi/Three runtime objects as the canonical selection state.

---

## Events

Prefer explicit typed events for loosely coupled editor systems. Avoid uncontrolled global event buses. Event names and payloads must be typed.

```ts
interface EditorEvents {
  "selection.changed": { nodeIds: string[] };
  "scene.changed": { sceneId: string };
}
```

Do not use stringly typed event payloads without compile-time types.

---

## Performance (editor)

Do not re-render React on every Pixi ticker frame. Do not serialize entire scenes every frame. Avoid unnecessary Pixi/Three object recreation. Viewport and subscription details: `.cursor/rules/editor-ui.mdc`. Cross-cutting performance: [`architecture.md`](./architecture.md).
