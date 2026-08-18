---
name: architecture-change
description: >-
  Plan and land architectural or cross-package changes (dependency direction,
  scene/domain schema, runtime/editor boundaries, persistence format, renderer
  abstractions, project-server APIs). Use when changing multiple packages,
  serialized formats, or package boundaries — not for localized UI, styling,
  or test-only edits.
---

# Architecture Change

Use this workflow for changes that cross package boundaries or alter persisted formats. Do not use it for a localized Inspector/UI/test fix.

## 1. Orient, then read only what you need

Consult `PROJECT.md` for repository orientation. Developer index: `docs/README.md`.

Read **only** the detailed docs that match this change. Do not load the full `docs/` set.

| If the change involves | Read |
| --- | --- |
| Package boundaries, quality, errors, performance | `docs/architecture.md` |
| Scene/domain schema, components, serialization, prefabs | `docs/scene-model.md` |
| Script components (defineComponent) | `docs/guides/add-a-script-component.md` |
| Asset database, import, generated files | `docs/assets.md` |
| Aseprite compile | `docs/aseprite.md` |
| Editor core / commands / selection | `docs/editor.md` |
| Runtime, game builds, optional renderers | `docs/runtime.md` |
| Pixi / Three adapters, hybrid layers | `docs/renderers.md` |
| project-server APIs, path confinement | `docs/project-server.md` |
| Collaboration / locking | `docs/collaboration.md` |

## 2. Check invariants

If the request would violate an invariant in `PROJECT.md`, stop and propose an alternative. In particular:

* runtime must not depend on editor;
* domain must not store Pixi/Three instances;
* assets use stable `assetId`s;
* browser FS goes through project-server;
* optional renderers stay optional;
* persisted formats stay versioned.

## 3. Plan before coding

Inspect existing packages and public APIs. Produce a short plan covering:

1. affected packages and dependency direction;
2. public API changes;
3. persistence/schema/migration impact;
4. undo/redo impact;
5. renderer vs domain split;
6. tests.

Do not start generating files until that plan is coherent.

## 4. Implement the smallest coherent slice

Reuse existing abstractions. Do not introduce parallel domain models or speculative layers.

Preserve package dependency direction. Domain packages must not import `apps/*` or editor UI. `runtime` must not import editor packages.

## 5. Validate

Run relevant `pnpm typecheck` / `pnpm test` / `pnpm lint` for affected packages. Update the docs you actually changed; do not expand unrelated documentation.
