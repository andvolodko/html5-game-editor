# Editor hotkeys

Keyboard shortcuts in the HTML5 Game Editor. **Ctrl** on Windows/Linux is **Cmd** on macOS (`event.metaKey`).

Chords match the physical key (`event.code`) so they still work on non-Latin layouts.

Undo/redo and save are implemented in `packages/editor-core/src/editor-hotkeys.ts` (`bindEditorHotkeys`). Open Scene lives on the toolbar. Assets-panel catalogue keys are handled only while that panel is focused.

## File

| Action | Shortcut |
| --- | --- |
| Save scene | Ctrl+S |
| Open scene | Ctrl+O |

Save still runs while focus is in an Inspector field (and suppresses the browser “Save page” dialog). Open Scene is blocked while an unsaved-changes dialog is open.

## Edit

| Action | Shortcut |
| --- | --- |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y or Ctrl+Shift+Z |

These apply to the command history (scene edits and undoable asset/folder operations). They work from Hierarchy, Scene, and Assets. They do **not** run while typing in an `<input>`, `<textarea>`, or contenteditable field — the browser handles text undo there.

## Scene and Hierarchy

These run unless focus is in a text field or the Assets panel.

| Action | Shortcut |
| --- | --- |
| Duplicate selected node | Ctrl+D |
| Copy selected node(s) | Ctrl+C |
| Paste node(s) | Ctrl+V |
| Delete selected node(s) | Delete |
| Rename selected node | F2 |
| Nudge selected node(s) 1 px | Arrow keys |

Ctrl+C is skipped when the DOM has a text selection so the browser can copy that text.

## Assets panel (panel focused)

| Action | Shortcut |
| --- | --- |
| Copy selected asset or scene (catalogue) | Ctrl+C |
| Paste / duplicate into the current folder | Ctrl+V |
| Rename asset, scene, or folder | F2 |
| Delete asset, scene, or folder | Delete or Backspace |

## 3D viewport (Three / hybrid scenes)

| Action | Shortcut |
| --- | --- |
| Translate gizmo | W |
| Rotate gizmo | E |
| Scale gizmo | R |

Ignored while a modifier key is held or while typing in a field.

## Viewport (mouse)

| Action | Input |
| --- | --- |
| Zoom | Mouse wheel |
| Pan camera | Middle-mouse drag |

## Dialogs and inline edit

| Action | Shortcut |
| --- | --- |
| Close menu / dialog / context menu | Escape |
| Commit inspector or rename field | Enter |
| Cancel inline rename | Escape |
