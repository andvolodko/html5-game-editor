# Roadmap

MVP phases and what is still ahead. Orientation: [`PROJECT.md`](../PROJECT.md). Operator-facing “suggested next work” also lives in [`README.md`](../README.md).

Do not attempt to implement the entire final editor at once.

---

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

See [`collaboration.md`](./collaboration.md).

## Phase 6 — Advanced Editor

* prefabs (instances, property overrides, prefab edit mode — shipped; variants and inherited structural edits still open);
* animation;
* custom inspectors;
* layout persistence;
* richer asset processing.

Operator-facing remaining work is listed in [`README.md`](../README.md#suggested-next-work).
