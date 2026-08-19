# Add a script component

Gameplay behaviours are Script components: serializable `scriptId` + `properties` on the node, and a live class constructed at runtime.

This guide walks through adding one that shows up in Inspector **Add Component** and runs in editor Preview and standalone `games/<name>` builds.

Scene persistence: [`scene-model.md`](../scene-model.md). Runtime host: [`runtime.md`](../runtime.md).

---

## What gets persisted

Scene JSON stores data only:

```json
{
  "type": "Script",
  "id": "comp_…",
  "scriptId": "editor-features-demo.CloneObject",
  "properties": { "objectName": "Enemy", "count": 10 }
}
```

Omit `enabled` when the behaviour should run (default). Persist `"enabled": false` to skip construction and ticks at runtime. Inspector **Enabled** (checkbox next to the component title) writes this field (undoable). Do not confuse it with a script property named `enabled`.

The behaviour class is created by `defineComponent({ create })` when `GameRuntime` loads the scene. Do not put class instances, functions, or Pixi/Three objects in `properties`.

---

## Where to put it

| Kind | Path | `id` |
| --- | --- | --- |
| This game only | `games/<name>/src/components/<kebab>.ts` | `<game>.PascalName` — e.g. `editor-features-demo.LoadingScene` |
| Reuse across games | `packages/game-components/src/shared/<kebab>.ts` | `shared.PascalName` — e.g. `shared.ChangeScene` |

Shared components stay runtime-safe: no React, Pixi, Three, or `editor-core`. They talk to the world through `ScriptCreateContext` (`transform`, `transform3D`, `animations`, and `services` for anything else) defined in `packages/game-components/src/types.ts`.

Existing examples:

| File | Pattern |
| --- | --- |
| `games/editor-features-demo/src/components/cloud.ts` | OOP lifecycle + `ctx.transform` + live properties |
| `games/editor-features-demo/src/components/clone-object.ts` | Pointer subscribe in `start()`, cleanup in `destroy()` |
| `packages/game-components/src/shared/change-scene.ts` | Shared: bus event → `changeScene(sceneId)` |

Prefer a **behaviour class** that implements `ScriptInstance` for anything beyond a few lines.

---

## 1. Define the component

One file, one behaviour class (`PascalCase` + `Behaviour`). Constructor stores context and parsed properties only. Subscribe and capture rest pose in `start()`. Unsubscribe in `destroy()`.

```ts
import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

type Props = {
  speed: number;
  enabled: boolean;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    speed: typeof raw.speed === "number" ? raw.speed : 1,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
  };
}

export class SpinControllerBehaviour implements ScriptInstance {
  private speed = 1;
  private enabled = true;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    const { bus } = this.ctx.services;
    this.unsubscribers.push(
      bus.on("game.tick", () => {
        if (!this.enabled) return;
        // use ctx.nodeId, ctx.transform, ctx.services …
      }),
    );
  }

  update(dt: number): void {
    if (!this.enabled || dt <= 0) {
      return;
    }
    this.ctx.transform.rotation += this.speed * dt;
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  destroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.speed = props.speed;
    this.enabled = props.enabled;
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  speed: {
    kind: "number",
    default: 1,
    min: 0,
    step: 0.1,
    description: "Degrees per second",
  },
  enabled: { kind: "boolean", default: true },
};

export const spinControllerComponent = defineComponent({
  id: "editor-features-demo.SpinController",
  displayName: "Spin Controller",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new SpinControllerBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installSpinControllerRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(spinControllerComponent.id, spinControllerComponent.create);
}
```

`id` is stable forever once scenes reference it. `displayName` / `category` are Inspector only.

Lifecycle (all hooks optional; `update`-only components still work):

```text
constructor → start() once → update(dt) each frame
           ↘ onPropertiesChanged(properties) on Inspector edits
           ↘ destroy() once on scene unload / disable
```

Do not assume the runtime node is fully ready in the constructor. Capture rest pose and subscribe in `start()`. Per-node deterministic variation can use `seededUnitFloat(seed, salt)` from `@game-editor/game-components` (`[0, 1)`, no global RNG).

Scene changes at runtime go through `ctx.services.changeScene("main")` (file id), not filesystem paths. Renderer objects stay in the adapter. For this component's own 2D pose, use `ctx.transform` (`x` / `y` / `rotation` / `scaleX` / `scaleY`). For 3D pose, use `ctx.transform3D`. For Model3D clips on this node, use `ctx.animations`. Use `setTransform2D` / `setSpriteAssetId` / `setText` when targeting another node or doing a one-off service call.

Preferred 3D style:

```ts
export const movementComponent = defineComponent({
  id: "game.Movement",
  displayName: "Movement",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  properties: {},
  create(ctx) {
    return {
      update(dt) {
        const { position } = ctx.transform3D;
        ctx.transform3D.setPosition({
          x: position.x + dt,
          y: position.y,
          z: position.z,
        });
      },
    };
  },
});
```

```ts
const clips = ctx.animations.list();

if (clips.includes("Idle")) {
  ctx.animations.play("Idle", {
    loop: true,
  });
}
```

`ctx.services` is the low-level runtime bridge (`getTransform3D`, `setModel3DPlayback`, …). Prefer the high-level context APIs when they cover the need.

---

## 2. Register it on the game barrel

Edit `games/<name>/src/components/index.ts`:

1. `registry.register(spinControllerComponent)` inside `registerGameComponents`.
2. Call `installSpinControllerRuntime(registry)` from `installGameRuntime`.
3. Keep `getComponentCatalog()` as `buildComponentCatalog(registerGameComponents, listBusEvents())` so project-server can serve Inspector metadata without `create` factories.

```ts
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(spinControllerComponent);
}

export function installGameRuntime(registry: ComponentRegistry): void {
  installSpinControllerRuntime(registry);
}
```

The standalone boot (`games/<name>/src/main.ts`) already calls `registerGameComponents` then `installGameRuntime`. The editor discovers `installGameRuntime` via `import.meta.glob` in `apps/editor/src/components/install-active-game-runtime.ts` after loading the metadata catalog.

Shared components: register in `packages/game-components/src/shared/register-shared-components.ts` and attach `create` from `installSceneFlowRuntime` (same split: catalog JSON vs live factories).

---

## 3. Bus events (optional)

Inspector `dynamicEnum` with `source: "busEvents"` reads the game’s event list, not a hardcoded string array on the definition.

Add entries in `games/<name>/src/events/bus-events.ts` and export them through `listBusEvents()` on the components barrel. Example: `games/editor-features-demo/src/events/bus-events.ts`.

---

## Property field kinds

| Kind | Inspector | Typical use |
| --- | --- | --- |
| `number` / `string` / `boolean` | Native controls | Scalars |
| `enum` | Fixed `<select>` | Closed string set |
| `dynamicEnum` + `source: "scenes"` | Scene file ids | Change Scene / next scene |
| `dynamicEnum` + `source: "busEvents"` | Game bus catalog | Listen / emit |
| `dynamicEnum` + `source: "gltfAnimations"` | Clips on that node’s Model3D | Playback |
| `asset` + `assetType` | Catalogue picker | Texture, audio, glTF, … |

`assetType` values: `texture`, `spine`, `audio`, `gltf`, `aseprite`, `font`, `webfont`, `tileset` (`COMPONENT_ASSET_TYPES`). Empty string means unset.

Optional `description` on any property is shown as an Inspector tooltip.

Adding a Script to a node in the editor is `AddScriptComponentCommand` (`packages/editor-core/src/commands/add-script-component-command.ts`): it copies defaults from the definition into `properties`.

---

## Runtime services (common)

`ScriptCreateContext.services` (`ScriptRuntimeServices`) is filled by `GameRuntime`. Useful methods:

- `bus` — typed `EventBus` from `@game-editor/core`
- `changeScene(sceneId)` — switch scene by file id
- `onNodePointerEvent(nodeId, "pointertap", handler)` — playback clicks
- `getTransform2D` / `setTransform2D` (and 3D equivalents) — other nodes or non-hot-path pose; not saved
- `ctx.transform` — persistent live 2D pose of **this** node (`x`/`y`/`rotation`/`scaleX`/`scaleY`). Assignments update the rendered object immediately and do not write editor history or scene files.
- `ctx.transform3D` — current Transform3D of **this** node (`position` / `rotation` / `scale`). Getters are live; setters do not write editor history or scene files.
- `ctx.animations` — Model3D clips on **this** node (`list` / `play` / `stop` / `freeze` / `duration`)
- `playAudio` / `stopAudio` / `preloadSceneAsset` / `resolveAssetUrl`
- `cloneNodeByName` / `spawnModel3D` / `destroyNode` — runtime-only graph edits

`start` / `update` / `onPropertiesChanged` / `destroy` on `ScriptInstance` are optional; `GameRuntime.tick` drives `update` when implemented. Always `destroy()` subscriptions and timers.

---

## Checklist

- Behaviour implements `ScriptInstance`; `create: (ctx) => new …Behaviour(ctx)`
- Stable `id`, `properties` with defaults, registered in `registerGameComponents`
- `install*Runtime` uses `registry.attachRuntime(id, create)` and is hooked from `installGameRuntime`
- Bus events listed if you use `source: "busEvents"`
- No class instances or functions in scene JSON
- Shared scripts still have no renderer/editor imports

```bash
pnpm --filter @games/<name> typecheck
pnpm --filter @game-editor/game-components test
```

If you added Inspector catalog fields only, also run the editor package typecheck. Restart `pnpm dev` so project-server reloads `GET /components/catalog`.
