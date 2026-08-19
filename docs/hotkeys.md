# Editor hotkeys

Keyboard shortcuts in the HTML5 Game Editor. **Ctrl** on Windows/Linux is **Cmd** on macOS (`event.metaKey`).

Chords match the physical key (`event.code`) so they still work on non-Latin layouts.

Undo/redo and save are implemented in `packages/editor-core/src/editor-hotkeys.ts` (`bindEditorHotkeys`). Open Scene lives on the toolbar. Hierarchy and Assets tree navigation (arrows, Enter, Space) run only while that panel is focused.

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

These run unless focus is in a text field or the Assets panel. Arrow-key nudge is also skipped while the Hierarchy panel is focused — arrows then move the tree selection instead.

| Action | Shortcut |
| --- | --- |
| Duplicate selected node | Ctrl+D |
| Copy selected node(s) | Ctrl+C |
| Paste node(s) | Ctrl+V |
| Delete selected node(s) | Delete |
| Rename selected node | F2 |
| Nudge selected node(s) 1 px | Arrow keys (when Hierarchy is not focused) |
| Nudge selected node(s) 10 px | Shift+Arrow keys (when Hierarchy is not focused) |
| Toggle node in selection | Ctrl+click (Hierarchy and Scene) |
| Select visible range | Shift+click (Hierarchy) |
| Add visible range to selection | Ctrl+Shift+click (Hierarchy) |

Ctrl+C is skipped when the DOM has a text selection so the browser can copy that text. Drag a selected Hierarchy row to move the whole selection. Drag a selected node in the Scene view to move the whole selection (root-most nodes).

## Hierarchy panel (panel focused)

| Action | Shortcut |
| --- | --- |
| Previous / next visible row | Up / Down |
| Select first / last visible row | Home / End |
| Jump by a page of rows | PageUp / PageDown |
| Collapse, or select parent | Left |
| Expand, or select first child | Right |
| Show first child (expands the row) | Enter |
| Toggle expand / collapse | Space |
| Select all visible nodes | Ctrl+A |
| Extend selection | Shift+Up / Shift+Down |

## Assets panel (panel focused)

| Action | Shortcut |
| --- | --- |
| Previous / next visible row | Up / Down |
| Select first / last visible row | Home / End |
| Jump by a page of rows | PageUp / PageDown |
| Collapse folder, or select parent | Left |
| Expand folder, or select first child | Right |
| Open scene, open prefab, or show folder children | Enter |
| Toggle folder expand / collapse | Space |
| Select all visible rows | Ctrl+A |
| Extend selection | Shift+Up / Shift+Down |
| Copy selected asset or scene (catalogue) | Ctrl+C |
| Paste / duplicate into the current folder | Ctrl+V |
| Rename asset, scene, or folder | F2 |
| Delete selected asset(s), scene(s), or folder(s) | Delete or Backspace (assets confirm first) |
| Toggle item in selection | Ctrl+click |
| Select visible range | Shift+click |
| Add visible range to selection | Ctrl+Shift+click |

Drag selected assets to move them together onto a folder or into the scene.

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
| Move selected node(s) | Left-drag on a selected object |
| Toggle node in Scene selection | Ctrl+click (Cmd+click on macOS) |
| Marquee-select 2D nodes | Left-drag on empty Scene space |
| Add marquee hits to selection | Ctrl/Shift + left-drag on empty Scene space |

## Dialogs and inline edit

| Action | Shortcut |
| --- | --- |
| Close menu / dialog / context menu | Escape |
| Commit inspector or rename field | Enter |
| Cancel inline rename | Escape |
