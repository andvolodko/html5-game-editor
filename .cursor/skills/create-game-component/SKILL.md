---
name: create-game-component
description: >-
  Create game Script components (defineComponent + OOP behaviour class) for
  games/<name>/src/components or packages/game-components. Use when adding a
  game component, script component, behaviour, Loading/Change Scene logic,
  bus event handlers, or Inspector Add Component entries.
---

# Create Game Component (OOP)

Prefer an **OOP behaviour class** that implements `ScriptInstance`, then wrap it with `defineComponent({ create: (ctx) => new MyBehaviour(ctx) })`.

This skill is **only** Script components (`type: "Script"`). Scene node types → `.cursor/skills/add-node-type/SKILL.md`. Runtime services / `GameRuntime` / audio host (not a new `defineComponent`) → `.cursor/skills/implement-runtime-feature/SKILL.md`. New game package → `.cursor/skills/create-game/SKILL.md`.

Do **not** put large logic in a bare `create` closure. Do **not** store class instances in scene JSON.

## Placement

| Kind | Path | `id` prefix |
|------|------|-------------|
| Game-specific | `games/<name>/src/components/<kebab>.ts` | `<game>.PascalName` (e.g. `editor-features-demo.LoadingScene`) |
| Shared reusable | `packages/game-components/src/shared/<kebab>.ts` | `shared.PascalName` |

Shared components must stay runtime-safe: no React, Pixi, Three, or editor-core.

## OOP pattern (required)

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

/** Live instance — one per Script component on a node. */
export class SpinControllerBehaviour implements ScriptInstance {
  private speed = 1;
  private enabled = true;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.bind();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  update(dt: number): void {
    if (!this.enabled || dt <= 0) {
      return;
    }
    this.ctx.transform.rotation += this.speed * dt;
  }

  destroy(): void {
    this.unbind();
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.speed = props.speed;
    this.enabled = props.enabled;
  }

  private bind(): void {
    this.unbind();
    const { bus } = this.ctx.services;
    this.unsubscribers.push(
      bus.on("game.tick", () => {
        if (!this.enabled) return;
        // use ctx.nodeId, ctx.transform, ctx.transform3D, ctx.animations, services
      }),
    );
  }

  private unbind(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  speed: { kind: "number", default: 1, min: 0, step: 0.1 },
  enabled: { kind: "boolean", default: true },
};

export const spinControllerComponent = defineComponent({
  id: "example.SpinController",
  displayName: "Spin Controller",
  category: "UI",
  categoryOrder: 20,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new SpinControllerBehaviour(ctx),
});

/** Re-attach create after metadata-only catalog load. */
export function installSpinControllerRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(spinControllerComponent.id, spinControllerComponent.create);
}
```

### Class rules

1. **One behaviour class per file** (PascalCase + `Behaviour` suffix).
2. Construct from `ScriptCreateContext`; keep `ctx` private.
3. Parse properties in the constructor via `applyProperties`; update them in `onPropertiesChanged`.
4. Subscribe and capture rest pose in `start()` (node + `ctx.transform` are ready). Unsubscribe in `destroy()`.
5. Own-node 2D motion uses `ctx.transform` (`x` / `position`). Own-node 3D motion uses `ctx.transform3D`. Host Model3D clips use `ctx.animations`. Host audio uses `ctx.audio`. Use `getTransform2D` / `setTransform2D` for other nodes.
6. Use `ctx.services.changeScene(sceneId)` for scene changes — never hardcode FS paths.
7. Per-node deterministic variation: `seededUnitFloat(seed, salt)` in `[0, 1)`.
8. `start` / `update` / `onPropertiesChanged` / `destroy` are optional; `destroy()` is required if anything was subscribed or timed.
9. Never hold `PIXI.*` / `THREE.*` or mutate renderer objects from the behaviour.

## Wire into the game barrel

Update `games/<name>/src/components/index.ts`:

1. `registry.register(myComponent)` inside `registerGameComponents`.
2. Call `installXRuntime(registry)` from `installGameRuntime` (required for editor/preview after catalog strip).
3. If the component needs bus events in Inspector dropdowns, add them to `src/events/bus-events.ts` and export via `listBusEvents()`.

```ts
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(spinControllerComponent);
}

export function installGameRuntime(registry: ComponentRegistry): void {
  installSpinControllerRuntime(registry);
}
```

`getComponentCatalog()` must keep using `buildComponentCatalog(registerGameComponents, listBusEvents())` so project-server can serve Inspector metadata.

## Property field kinds

| Kind | Use |
|------|-----|
| `number` / `string` / `boolean` | Simple values |
| `enum` | Fixed string options |
| `dynamicEnum` + `source: "scenes"` | Scene file ids |
| `dynamicEnum` + `source: "busEvents"` | Game bus event catalog |
| `dynamicEnum` + `source: "gltfAnimations"` | Clip names on the host node's Model3D glTF |

Optional `description` is an Inspector tooltip.

## Checklist

- [ ] Behaviour class implements `ScriptInstance`
- [ ] `defineComponent` with stable `id`, `properties`, `create: (ctx) => new …`
- [ ] Registered in `registerGameComponents`
- [ ] `install*Runtime` uses `registry.attachRuntime` and is hooked from `installGameRuntime`
- [ ] Bus events listed if using `dynamicEnum` / `busEvents`
- [ ] No instances or functions persisted in scene JSON
- [ ] Game `typecheck` / `lint` pass

## References

- Human guide: `docs/guides/add-a-script-component.md`
- Scene persistence: `docs/scene-model.md`
- Shared Change Scene: `packages/game-components/src/shared/change-scene.ts`
- Cloud (reference 2D motion): `games/editor-features-demo/src/components/cloud.ts`
- Game Loading Scene (wait for Load All Scene Assets + minDisplayMs): `games/editor-features-demo/src/components/loading-scene.ts`
- Types: `packages/game-components/src/types.ts` (`ScriptCreateContext`, `ScriptRuntimeServices`, `ctx.transform3D`, `ctx.animations`)
- Catalog load: project-server `GET /components/catalog` + editor `installActiveGameRuntime`
