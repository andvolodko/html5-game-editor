# Architecture

Package boundaries, quality, and cross-cutting conventions. Read this for architectural or cross-package work — not for localized UI, styling, or test-only edits.

Orientation: [`PROJECT.md`](../PROJECT.md). Task-specific docs are linked from there.

---

## Dependency direction

Dependencies flow inward toward domain/core abstractions.

Preferred:

```text
scene
assets
commands
   ↑
editor-core
   ↑
editor UI
```

Rendering:

```text
core
 ↑  ↑
 │  │
Pixi Three
  \ /
runtime
```

Avoid cyclic dependencies. A lower-level package must not import from a higher-level application package.

Before importing across packages:

1. Verify dependency direction.
2. Avoid cycles.
3. Avoid importing app code into packages.
4. Keep domain packages independent of UI frameworks.

Runtime packages must not depend on editor packages. Games must be deployable without editor dependencies.

These rules are enforced by `pnpm lint:deps` (`dependency-cruiser`) and by CI.

Scene lookup uses `SceneIndex` (`packages/scene`) for O(1) id/parent queries. `DocumentManager` and `GameRuntime` keep the index in sync. `findNodeById` remains for one-off tree walks.

`GameRuntime` is the public runtime façade. Renderer order, pointer subscriptions, script services, and frame stats live in `packages/runtime/src/runtime-*.ts`. Gameplay scripts should prefer `ctx.node` / `ctx.transform` / `ctx.transform3D` / `ctx.animations` / `ctx.audio` / `ctx.scene` over low-level `ScriptRuntimeServices`.

---

## TypeScript

`tsconfig.base.json` is the source of truth: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`.

* Do not use `any`. Prefer `unknown` plus validation/narrowing.
* Public APIs need explicit types.
* Prefer discriminated unions for serialized variants.
* Avoid hiding type errors with assertions unless the boundary is justified.

Coding conventions live in `.cursor/rules/typescript.mdc`. Module-size guidance lives in `.cursor/rules/class-size.mdc`.

---

## Runtime validation

Serialized JSON is external input. Do not assume a file matches TypeScript interfaces because the editor wrote it.

Scene, project, and asset metadata must have runtime schema validation. Schema migration must be possible. See [`scene-model.md`](./scene-model.md).

---

## Error handling

Do not swallow errors.

Bad:

```ts
try {
  await save();
} catch {}
```

Prefer typed/domain errors (`DomainError` / `ValidationError` from `@game-editor/core`). Editor operations that may fail should surface meaningful messages. Filesystem and asset pipeline failures must include enough context for diagnosis. Native packaging failures use structured `BuildIssue` codes from `@game-editor/game-build` (see [`android-export.md`](./android-export.md)).

---

## Logging

Use structured logging where appropriate. Useful categories: `editor`, `scene`, `asset`, `renderer`, `build`, `collaboration`, `filesystem`.

Do not leave uncontrolled `console.log` calls across production code. The editor Console panel may consume structured editor/runtime logs.

---

## Testing strategy

Tests are required for core systems. Stack and file conventions: `.cursor/rules/testing.mdc`.

Prioritize unit tests for command manager, undo/redo, scene serialization and migration, asset references, resource locks, asset metadata, atlas configuration, and coordinate transforms.

Use integration tests for filesystem project operations, asset imports, scene load/save, collaboration server, and atlas generation.

UI tests should focus on valuable workflows rather than implementation details.

PR quality gates live in `.github/workflows/ci.yml`. GitHub Pages deploy (`.github/workflows/deploy-editor-demo.yml`) runs `pnpm build:pages` after a successful `CI` on `master`; it does not re-run typecheck, lint, or tests.

---

## Code quality

Prefer small focused modules, explicit dependencies, composition, pure functions for transformations, and deterministic behavior. Dependency injection only where it genuinely reduces coupling.

Avoid god classes, static global service registries, hidden singleton state, deep inheritance, circular dependencies, duplicated domain models, and large React components that contain business logic.

---

## Naming

Names should express domain intent: `SceneDocument`, `CommandManager`, `AssetDatabase`, `ResourceLockService`, `PixiSceneRenderer`, `ThreeSceneRenderer`.

Avoid vague names (`Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Stuff`). Generic utility modules should be narrowly scoped.

---

## Files

Prefer one major concept per file. Do not produce hundreds of tiny files for trivial abstractions. Balance modularity with navigability.

Keep package public APIs explicit through barrel files (`src/index.ts`) where useful. Avoid unrestricted barrel imports that create dependency cycles.

---

## Dependency policy

Before introducing a new dependency:

1. Verify that it solves a real problem.
2. Check whether the functionality is already available.
3. Evaluate bundle impact for runtime dependencies.
4. Avoid overlapping libraries solving the same problem.

Editor-only dependency size is less critical than game runtime dependency size. Runtime bundle size is a first-class consideration.

---

## Performance

Do not optimize blindly. Architecture should still avoid obvious production problems:

* no React re-render on every Pixi ticker frame;
* do not serialize entire scenes every frame;
* avoid rebuilding asset indexes unnecessarily;
* use incremental asset processing;
* use dirty/update flags where useful;
* avoid unnecessary Pixi/Three object recreation.

Use profiling before complicated optimization. Editor viewport details: [`editor.md`](./editor.md).

---

## Definition of done

A feature is not complete merely because it visually works. For a non-trivial feature, completion means as applicable:

* architecture is consistent;
* types compile; lint and tests pass;
* undo/redo works; save/load works;
* errors are handled; serialized format remains valid;
* no editor dependency leaked into runtime;
* no unnecessary renderer dependency leaked into a game bundle;
* relevant documentation is updated.
