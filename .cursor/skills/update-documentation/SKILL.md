---
name: update-documentation
description: >-
  Update repository documentation so it matches the implementation (README,
  PROJECT.md, docs/* topic pages, hotkeys, feature tables). Use after a user-visible
  or architectural change when existing docs would be wrong or incomplete — not
  to rewrite roadmap or add churn.
---

# Update Documentation

Keep human docs aligned with **code**. Code wins when they disagree.

Do not update roadmap/history sections merely to produce documentation churn.

Only update documentation that becomes incorrect or incomplete because of the implementation.

## When to use this skill

- A shipped behavior, format, command, hotkey, panel, asset kind, node type, or package boundary changed.
- `PROJECT.md` / `docs/README.md` “start here” tables would send readers to the wrong file.
- README feature table or layout/port list would omit a new game or capability.

Do **not** use this to:

- Rewrite `docs/roadmap.md` or README “Suggested next work” because a task was completed unless that line is now **false**.
- Add new topic pages for localized Inspector/UI tweaks.
- Duplicate `.cursor/rules/*.mdc` into `docs/`.

## Before changing code (or finishing a feature)

1. Diff the implementation against the docs in the table below — do not load every file.
2. Treat these as authoritative:

| Kind | File |
| --- | --- |
| Operator setup, ports, games list, feature table | `README.md` |
| Invariants, packages, which topic to open | `PROJECT.md` |
| Developer “I want to…” index | `docs/README.md` |
| Scene JSON / components / prefabs | `docs/scene-model.md` |
| Script components how-to | `docs/guides/add-a-script-component.md` |
| Assets / generated files | `docs/assets.md` |
| Aseprite CLI | `docs/aseprite.md` |
| Editor façade, commands, panels | `docs/editor.md` |
| Shortcuts | `docs/hotkeys.md` |
| Runtime / independent games | `docs/runtime.md` |
| Pixi/Three adapters, node-type table | `docs/renderers.md` |
| HTTP / path confinement | `docs/project-server.md` |
| Package boundaries, performance | `docs/architecture.md` |
| Collaboration (design only today) | `docs/collaboration.md` — do not describe it as shipped |
| Phases / remaining work | `docs/roadmap.md` |
| Screenshots | `docs/screenshots/` |

Cursor workflows live in `.cursor/skills/` (this tree). Persistent constraints live in `.cursor/rules/`. Do not copy a skill into `docs/` unless a human how-to is missing (`docs/guides/add-a-script-component.md` already pairs with `create-game-component`).

3. `docs/collaboration.md` is **not implemented**. Do not claim locking exists.

## Workflow

1. List user-visible or contract changes (format, API, UI, commands, games).
2. For each change, open **only** the matching row in the table.
3. Update statements that would mislead a developer tomorrow (status line, type tables, file paths, version numbers that the doc claims).
4. If you added a game: README layout + port list + Pages `/games/<id>/` (already required by `create-game`).
5. If you added a hotkey: `docs/hotkeys.md` and the README Hotkeys section if it duplicates them.
6. If you added a dock panel or asset/node kind: README Features table and `docs/editor.md` / `docs/renderers.md` / `docs/assets.md` as applicable.
7. Leave design-only future tense in place unless the feature actually shipped.
8. Do not add unverified screenshots.

## What not to touch

- `docs/roadmap.md` checkboxes / history for the sake of a “docs commit”.
- Unrelated guides.
- Comments that restate types.
- Inventing APIs in docs that are not in code (no fake migration runner — see `.cursor/skills/modify-scene-schema/SKILL.md`).

## Representative accuracy checks

- Scene schema still `version: 1` with no migration runner — `docs/scene-model.md` says this; keep it true.
- Asset kinds listed in `docs/assets.md` must match `AssetType` in `packages/assets/src/types.ts`.
- Node-type table in `docs/renderers.md` must match `packages/editor-core/src/node-types/`.
- README Features panels must match `EDITOR_PANEL_IDS` in `apps/editor/src/settings/editor-settings-storage.ts`.

## Validation / Definition of Done

- [ ] Every edited sentence is true of the current tree.
- [ ] Paths in docs exist.
- [ ] No roadmap churn without a false claim.
- [ ] Status lines (`**Status:** shipped` vs design-only) still match.
- [ ] Feature/kind tables match TypeScript unions and registries.

## Common failure modes

- Updating `PROJECT.md` architecture diagram but leaving `docs/README.md` “I want to…” links stale.
- Documenting a command that was not exported from `@game-editor/editor-core`.
- Copying skill checklists into `docs/scene-model.md` until it diverges.
- Marking collaboration or schema migrations as done because types have a `version` field.
- Listing Spine/glTF as supported in README while the renderer table still says planned (or the reverse).
