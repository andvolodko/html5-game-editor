---
name: add-editor-panel
description: >-
  Add a dockable editor panel (Dockview id, React view, default layout,
  persisted layout version, subscriptions, cleanup). Use when adding panels
  such as Animation, Profiler, Tilemap tools, Physics debugger, Audio mixer,
  or Prefab overrides as a new dock region — not Inspector sections.
---

# Add Editor Panel

Workflow for a new **dockable panel** in `apps/editor`. Docking is layout-only — it must not become domain state.

Follow `.cursor/rules/editor-ui.mdc`. Canonical scene/editor state lives on `Editor` (`packages/editor-core`). React is a view.

## When to use this skill

- Adding a first-class dock region (Animation, Profiler, mixer, debugger, extra browser, …).
- Splitting an overcrowded panel into its own dockview component.

Do **not** use this for:

- A new Inspector **section** (Hit Zone, Mask, Model3D, Scripts) — those stay in `InspectorPanel.tsx`.
- A new scene node type (`.cursor/skills/add-node-type/SKILL.md`).
- Domain/undo logic — put that in editor-core commands (`.cursor/skills/add-editor-command/SKILL.md`).

Prefab overrides already live in `PrefabInspectorSection.tsx` inside Inspector. A dedicated Prefab Overrides **panel** would still read `Editor` / `prefabs` and dispatch commands — do not duplicate override application in React.

## Before changing code

1. Confirm the UI cannot be an Inspector section or Toolbar control.
2. Copy the thinnest existing panel (`ConsolePanel.tsx` or `ProjectSettingsPanel.tsx`), not `InspectorPanel.tsx`.
3. Identify state sources: `useEditor()` + `useEditorState(selector)`. Asset-preview selection is UI-local (`asset-preview-selection.tsx`) — do not confuse it with node selection.
4. Read `docs/editor.md`. There is **no Zustand store** in this repo.

## Implementation workflow

### 1. Stable panel id

Add the id to `EDITOR_PANEL_IDS` in `apps/editor/src/settings/editor-settings-storage.ts`.

The id is both Dockview `id` and `component` key.

### 2. Panel component

Create `apps/editor/src/panels/<Name>Panel.tsx`.

- Read via `useEditorState((ed) => …)` so re-renders follow `Editor` revision/selection, not a copied scene graph in React state.
- Mutate via `editor.execute` / façade methods / workflows (`importDroppedFiles`, `dropAssetOntoScene`).
- Do **not** store scene trees, transforms, or the asset catalogue as React source of truth.
- Dispose every `editor.subscribe` / `assets.subscribe` / renderer attach / timer in the same effect cleanup.
- Do not push per-frame drag positions through React state.

### 3. Register with Dockview

Wire three places (all required):

| Place | File |
| --- | --- |
| Component map | `apps/editor/src/layout/DockLayout.tsx` (`const components = { … }`) |
| Default layout | `apps/editor/src/layout/default-layout.ts` (`applyDefaultEditorLayout`) |
| Panel id | `EDITOR_PANEL_IDS` |

Bump `EDITOR_LAYOUT_VERSION` when the default panel set or ids change. Stale `localStorage` layouts are discarded on version mismatch (`createLocalStorageEditorSettings`). Do not migrate opaque dockview JSON.

Optional: popout header titles in `apps/editor/src/layout/PopoutHeaderActions.tsx` (today Console/Preview).

Toolbar stays outside Dockview (`DockLayout` renders `<Toolbar />` above the dock host).

### 4. Layout persistence

`DockLayout` saves `api.toJSON()` (debounced) with `EDITOR_LAYOUT_VERSION`. Reset layout calls `applyDefaultEditorLayout`. Do not persist selection, documents, or asset folders in layout JSON.

### 5. Styling

Add classes in `apps/editor/src/styles.css` next to other `.panel-*` rules. Reuse existing panel chrome (`panel`, toolbars, empty states).

### 6. Tests

Layout/popout: `apps/editor/src/layout/dockview-popout.test.ts`, `apps/editor/src/settings/editor-settings-storage.test.ts`.

Keep React tests rare. Policy and folder/command logic belong in `packages/editor-core` tests.

## Representative implementations

| Panel | Component | Notes |
| --- | --- | --- |
| Console | `ConsolePanel.tsx` | Thin: `editor.console` + `useEditorState` |
| Project Settings | `ProjectSettingsPanel.tsx` | Project JSON via `Editor.project` |
| Preview | `PreviewPanel.tsx` | Mounts `GameRuntime` in `game-preview-session.ts`; dispose on unmount |
| Asset Preview | `AssetPreviewPanel.tsx` | UI-local asset id + catalogue from `Editor.assets` |
| Scene | `ScenePanel.tsx` | Constructs `PixiSceneRenderer` / Three in an effect; teardown `unbindTool`, `detachRenderer`, `destroy()` |
| Hierarchy / Assets / Inspector | existing panels | Heavier; do not clone wholesale |

## Validation / Definition of Done

- [ ] Id in `EDITOR_PANEL_IDS`, `DockLayout` `components`, and `applyDefaultEditorLayout`.
- [ ] `EDITOR_LAYOUT_VERSION` bumped if the default set/ids changed.
- [ ] Panel is a view: no domain mutations except through `Editor` / commands.
- [ ] Subscriptions, renderers, and timers dispose on unmount.
- [ ] Reset Layout shows the new panel.
- [ ] Typecheck/lint for `apps/editor`; add tests only where layout/settings contracts changed.

## Common failure modes

- New React component without Dockview registration → panel never appears; layout restore cannot create it.
- Forgetting to bump `EDITOR_LAYOUT_VERSION` → users keep an old layout and never see the panel until Reset Layout.
- Copying scene JSON into `useState` → Inspector/Hierarchy diverge from `DocumentManager`.
- Attaching a renderer in the panel without destroy on unmount → WebGL/Pixi leaks (see Scene/Preview teardown).
- Putting command/undo policy in the panel module → duplicates editor-core; next consumer cannot reuse it.
- Using layout JSON as a second document store → docking becomes domain state.
