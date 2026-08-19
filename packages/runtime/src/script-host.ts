import type { EventBus } from "@game-editor/core";
import {
  createScriptContext,
  type ComponentRegistry,
  type RuntimeTransform2D,
  type ScriptInstance,
  type ScriptRuntimeServices,
} from "@game-editor/game-components";
import {
  flattenNodes,
  getScriptComponents,
  isScriptEnabled,
  type SceneData,
} from "@game-editor/scene";

type ScriptHookName = "start" | "update" | "onPropertiesChanged" | "destroy";

interface LiveScriptBinding {
  nodeId: string;
  componentId: string;
  scriptId: string;
  instance: ScriptInstance;
  started: boolean;
  destroyed: boolean;
  propertiesKey: string;
}

function propertiesKey(
  properties: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify(properties);
}

/**
 * Instantiates registered Script components for a loaded scene.
 * Instances are kept off the scene graph (never written into SceneData).
 * Each instance receives a persistent `ctx.transform` bound at create time,
 * plus `ctx.transform3D` and `ctx.animations` wrappers for the host node.
 */
export class ScriptHost {
  private readonly bindings: LiveScriptBinding[] = [];

  constructor(
    private readonly registry: ComponentRegistry | undefined,
    private readonly services: ScriptRuntimeServices | undefined,
    private readonly resolveTransform: (nodeId: string) => RuntimeTransform2D,
  ) {}

  clear(): void {
    for (const binding of this.bindings) {
      this.destroyBinding(binding);
    }
    this.bindings.length = 0;
  }

  /** Build live instances for every enabled Script component in the scene. */
  attachScene(scene: SceneData): void {
    this.clear();
    if (!this.registry || !this.services) {
      return;
    }

    for (const node of flattenNodes(scene)) {
      for (const component of getScriptComponents(node)) {
        if (!isScriptEnabled(component)) {
          continue;
        }
        const definition = this.registry.get(component.scriptId);
        if (!definition?.create) {
          continue;
        }
        let instance: ScriptInstance;
        try {
          instance = definition.create(
            createScriptContext({
              nodeId: node.id,
              componentId: component.id,
              scriptId: component.scriptId,
              properties: component.properties,
              services: this.services,
              transform: this.resolveTransform(node.id),
            }),
          );
        } catch (error) {
          console.error(
            `[ScriptHost] create failed (scriptId=${component.scriptId} componentId=${component.id} nodeId=${node.id})`,
            error,
          );
          continue;
        }
        this.bindings.push({
          nodeId: node.id,
          componentId: component.id,
          scriptId: component.scriptId,
          instance,
          started: false,
          destroyed: false,
          propertiesKey: propertiesKey(component.properties),
        });
      }
    }

    for (const binding of this.bindings) {
      this.startBinding(binding);
    }
  }

  getInstanceCount(): number {
    return this.bindings.length;
  }

  /**
   * Per-frame gameplay loop. Calls `update(dt)` on live script instances.
   */
  tick(dt: number): void {
    for (const binding of this.bindings) {
      if (binding.destroyed || !binding.instance.update) {
        continue;
      }
      this.invokeHook(binding, "update", () => {
        binding.instance.update?.(dt);
      });
    }
  }

  notifyPropertiesChanged(
    nodeId: string,
    componentId: string,
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const key = propertiesKey(properties);
    for (const binding of this.bindings) {
      if (binding.nodeId !== nodeId || binding.componentId !== componentId) {
        continue;
      }
      if (binding.destroyed || binding.propertiesKey === key) {
        return;
      }
      binding.propertiesKey = key;
      if (!binding.instance.onPropertiesChanged) {
        return;
      }
      this.invokeHook(binding, "onPropertiesChanged", () => {
        binding.instance.onPropertiesChanged?.(properties);
      });
      return;
    }
  }

  private startBinding(binding: LiveScriptBinding): void {
    if (binding.started || binding.destroyed) {
      return;
    }
    binding.started = true;
    if (!binding.instance.start) {
      return;
    }
    this.invokeHook(binding, "start", () => {
      binding.instance.start?.();
    });
  }

  private destroyBinding(binding: LiveScriptBinding): void {
    if (binding.destroyed) {
      return;
    }
    binding.destroyed = true;
    if (!binding.instance.destroy) {
      return;
    }
    this.invokeHook(binding, "destroy", () => {
      binding.instance.destroy?.();
    });
  }

  private invokeHook(
    binding: LiveScriptBinding,
    hook: ScriptHookName,
    run: () => void,
  ): void {
    try {
      run();
    } catch (error) {
      console.error(
        `[ScriptHost] ${hook} failed (scriptId=${binding.scriptId} componentId=${binding.componentId} nodeId=${binding.nodeId})`,
        error,
      );
    }
  }
}

export type { EventBus };
