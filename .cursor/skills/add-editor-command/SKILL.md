---
name: add-editor-command
description: >-
  Add an undoable editor command for scene, asset, prefab, or tilemap mutations.
  Use when implementing create/delete/rename/move/property edits, continuous
  gestures that must commit one history entry, or when UI currently mutates
  DocumentManager without CommandManager.
---

# Add Editor Command

Strict workflow for mutations that participate in **undo/redo**.

Follow `.cursor/rules/editor-commands.mdc` and `.cursor/rules/editor-ui.mdc`. Do not copy those files here.

## When to use this skill

- User-visible project/scene/asset edits that must undo.
- A React panel currently calls `document` mutators directly.
- A pointer/paint gesture needs **one** history entry on completion.
- Adding a façade method on `Editor` that changes persisted state.

Do **not** use this for:

- Script gameplay (`create-game-component` / `implement-runtime-feature`).
- Transient UI (Inspector draft strings, Asset Browser search, dock layout).
- Runtime-only motion that must not write scene files (`GameRuntime` / `setTransform2D` on scripts).

## Before changing code

1. Ask: does this change user-editable project state? If yes, it needs a `Command`.
2. Find the closest command under `packages/editor-core/src/commands/` and copy its shape.
3. Decide sync vs async:

| | Sync (`execute` / `undo`) | Async (`async: true`, `executeAsync`) |
| --- | --- | --- |
| Typical | scene graph, transforms, components | catalogue/disk (`DeleteAssetCommand`, rename folder, scene file) |
| Manager | `CommandManager.execute` | `CommandManager.executeAsync` |

4. `CommandManager` has **no merge/coalesce API**. Do not invent command squashing. Continuous tools preview on the renderer and commit **one** command on pointer-up (or one stroke). Group several already-built commands with `CompositeCommand`.

## Implementation workflow

### 1. One class per file

Create `packages/editor-core/src/commands/<kebab-name>-command.ts`.

```ts
export class SetExampleCommand implements Command {
  readonly name = "SetExample";
  private readonly before: Example;
  private readonly after: Example;

  constructor(
    private readonly document: DocumentManager,
    /* selection if the command changes it */
  ) {
    // Capture before/after in the constructor from current document state.
  }

  execute(): void { /* apply after */ }
  undo(): void { /* restore before */ }
}
```

Rules:

- Capture **before/after** (or the created node) in the constructor — do not re-read “current” state on undo.
- Mutate only through `DocumentManager` / `SelectionManager` / asset host APIs. Never Pixi, Three, or React state.
- Restore selection on undo when execute changed it (`selection.restore(previousSelection)`).
- Shared helpers used by multiple commands go in sibling modules (`clone-transform-2d.ts`), not inside a command file others import.

### 2. Document mutations

If `DocumentManager` cannot express the edit, add a focused mutator that emits a `SceneMutation` (`create` / `update` + `reason` / `destroy` / `move` / `scene-meta` / `reload`). `EditorViewportController` maps those to incremental `SceneRenderer` ops.

Dirty state is `DocumentManager` content snapshot vs last save. Do not add a React dirty flag.

### 3. Wire the façade (only if UI/hotkeys need it)

- Re-export from `packages/editor-core/src/commands/index.ts` and the package `src/index.ts` barrel.
- Add `Editor` convenience that calls `this.execute(command)` or `executeAsync`.
- Hotkeys: `packages/editor-core/src/editor-hotkeys.ts` (`bindEditorHotkeys`). Document user-visible chords in `docs/hotkeys.md` via `.cursor/skills/update-documentation/SKILL.md`.

### 4. UI

Panels read via `useEditor` / `useEditorState`. They must not call `document.addRootNode` / `applyTransform2D` / similar.

Inspector drafts stay local until blur/Enter. Drag preview stays in the renderer (`previewNodePosition`); pointer-up runs `SetTransform2DCommand`.

Tilemap paint: accumulate cell changes, then one `PaintTilemapCommand` per stroke.

### 5. Tests

Colocate or extend:

- `packages/editor-core/src/commands.test.ts`
- Focused `*.test.ts` next to the command (`paint-tilemap-command.test.ts`, `reset-node-transform-command.test.ts`)
- `packages/commands/src/command-manager.test.ts` only if the manager contract changes

Assert execute + undo (+ redo). Assert selection and dirty (`undo` back to saved snapshot → clean). Follow `.cursor/rules/testing.mdc`.

## Representative implementations

| Pattern | File |
| --- | --- |
| Create + select | `create-node-command.ts` (registry-based; prefer this over new `CreateFooCommand`) |
| Before/after component | `set-transform-2d-command.ts`, `set-visual-component-command.ts`, `set-node-visible-command.ts` |
| Hierarchy | `move-node-command.ts`, `duplicate-node-command.ts`, `delete-nodes-command.ts` |
| Gesture → one command | `paint-tilemap-command.ts`; transform tool pointer-up → `SetTransform2DCommand` |
| Composite | `CompositeCommand` (`packages/commands/src/command-manager.ts`); `Editor` nudge / multi-move |
| Async catalog | `delete-asset-command.ts`, `rename-asset-command.ts` |
| Already applied | `CommandManager.record` (skip execute; redo still calls `execute`) |
| Factory of commands | `create-delete-selection-command.ts` |

## Validation / Definition of Done

- [ ] One command class per file; exported from `commands/index.ts`.
- [ ] `execute` / `undo` are symmetric; redo works.
- [ ] Selection restored on undo when it changed.
- [ ] Viewport updates via document mutations, not React → renderer calls.
- [ ] One completed gesture = one undo step.
- [ ] UI does not bypass `editor.execute` / `executeAsync`.
- [ ] Tests cover execute/undo and any selection/dirty side effects.
- [ ] Typecheck/tests for `@game-editor/editor-core` (and `@game-editor/commands` if touched).

## Common failure modes

- Mutating `getScene()` in a panel → undo stack never sees the edit; save may still persist it.
- Calling `execute()` twice with the same instance → after-state applied twice; capture state in the constructor, execute once via the manager.
- Per-frame `SetTransform2DCommand` during drag → undo history explosion. Preview, then one commit.
- Async command used with sync `undo()` → `CommandManager` throws; mark `readonly async = true` and use `undoAsync`.
- Holding `PIXI.*` / `THREE.*` on the command → domain/renderer split is broken; commands store serializable before/after only.
- Adding a new class to a bag file (`commands.ts`) — forbidden by `.cursor/rules/editor-commands.mdc`.
