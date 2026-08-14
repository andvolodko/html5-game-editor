---

name: implement-editor-feature
description: Plan and implement a production-quality feature in the hybrid PixiJS/Three.js game editor while preserving architecture, undo/redo, persistence and tests.
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Implement Editor Feature

Use this workflow whenever implementing a meaningful feature in the editor.

## Step 1 — Understand the request

Restate internally:

* what user behavior is required;
* which editor panels are involved;
* whether runtime behavior is involved;
* whether persisted data changes;
* whether asset processing changes.

Do not immediately generate code.

Consult `PROJECT.md` for repository orientation when needed. Read **only** the docs that match this change. Do not load unrelated documentation for localized Inspector, UI, styling, or test-only work.

| Layer | Doc |
| --- | --- |
| Scene / domain / serialization | `docs/scene-model.md` |
| Assets | `docs/assets.md` |
| Editor core / UI / commands | `docs/editor.md` |
| Runtime / games | `docs/runtime.md` |
| Pixi / Three | `docs/renderers.md` |
| project-server | `docs/project-server.md` |
| Collaboration | `docs/collaboration.md` |

Cross-package or schema/boundary work: `.cursor/skills/architecture-change/SKILL.md`.

---

## Step 2 — Inspect existing implementation

Search the repository for:

* related components;
* related domain models;
* commands;
* services;
* renderer implementations;
* serialization schemas;
* tests.

Reuse existing abstractions where appropriate.

Do not create duplicate systems.

---

## Step 3 — Determine affected layers

Classify each change into one or more layers:

```text
React UI
Editor Core
Commands
Scene Domain
Asset Domain
Project Server
Pixi Renderer
Three Renderer
Runtime
Serialization
Tests
```

Keep responsibilities separated.

---

## Step 4 — Check architectural invariants

Verify:

* runtime does not depend on editor;
* domain does not depend on Pixi or Three;
* assets use stable IDs;
* optional Three support remains optional;
* browser does not receive unrestricted filesystem capabilities.

If the requested feature would violate an invariant, propose a cleaner architecture first.

---

## Step 5 — Undo / Redo analysis

Ask:

> Does this operation change user-editable project state?

If yes, determine whether it needs a Command.

Typical command operations:

```text
create
delete
rename
move
reparent
duplicate
set property
add component
remove component
```

Continuous pointer interaction should create one command on completion.

---

## Step 6 — Persistence analysis

If serialized data changes:

1. update TypeScript model;
2. update runtime validation schema;
3. update format version if needed;
4. create migration when compatibility requires it;
5. update serialization tests.

Do not change persisted formats casually.

---

## Step 7 — Rendering analysis

If visual behavior changes, determine whether the feature is:

```text
renderer-independent
Pixi-specific
Three-specific
hybrid
```

Renderer-specific code belongs in renderer packages.

Do not introduce `PIXI.*` or `THREE.*` types into the serialized domain model.

---

## Step 8 — Plan

Before implementation, produce a concise plan similar to:

```text
1. Add domain type X.
2. Add command Y.
3. Add renderer adapter support.
4. Add inspector control.
5. Add serialization.
6. Add tests.
```

Mention affected files/packages.

For large features, implement incrementally.

---

## Step 9 — Implement smallest coherent slice

Prefer vertical slices that compile and are testable.

Do not scaffold large numbers of unused abstractions.

Avoid speculative future systems.

Add extension points only where foreseeable requirements justify them.

---

## Step 10 — Validate

Run the relevant commands available in the repository:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

If the repository defines package-specific checks, run those for affected packages.

Do not claim success without running available checks.

---

## Step 11 — Review

Before finishing, review the diff for:

* architecture violations;
* unnecessary dependencies;
* duplicate code;
* stale imports;
* unsafe type assertions;
* missing error handling;
* missing undo support;
* missing persistence updates;
* missing tests.

---

## Step 12 — Report

Summarize:

* what was implemented;
* architectural decisions;
* tests/checks performed;
* known limitations;
* logical next step if any.

Do not produce a long generic explanation when the implementation itself is clear.
