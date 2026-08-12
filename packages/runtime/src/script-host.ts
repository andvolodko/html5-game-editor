import type { EventBus } from "@game-editor/core";
import type {
  ComponentRegistry,
  ScriptInstance,
  ScriptRuntimeServices,
} from "@game-editor/game-components";
import {
  flattenNodes,
  getScriptComponents,
  type SceneData,
} from "@game-editor/scene";

interface LiveScriptBinding {
  nodeId: string;
  componentId: string;
  scriptId: string;
  instance: ScriptInstance;
}

/**
 * Instantiates registered Script components for a loaded scene.
 * Instances are kept off the scene graph (never written into SceneData).
 * Full `update(dt)` scheduling is intentionally deferred.
 */
export class ScriptHost {
  private readonly bindings: LiveScriptBinding[] = [];

  constructor(
    private readonly registry: ComponentRegistry | undefined,
    private readonly services: ScriptRuntimeServices | undefined,
  ) {}

  clear(): void {
    for (const binding of this.bindings) {
      binding.instance.destroy?.();
    }
    this.bindings.length = 0;
  }

  /** Build live instances for every Script component in the scene. */
  attachScene(scene: SceneData): void {
    this.clear();
    if (!this.registry || !this.services) {
      return;
    }

    for (const node of flattenNodes(scene)) {
      for (const component of getScriptComponents(node)) {
        const definition = this.registry.get(component.scriptId);
        if (!definition?.create) {
          continue;
        }
        const instance = definition.create({
          nodeId: node.id,
          componentId: component.id,
          scriptId: component.scriptId,
          properties: component.properties,
          services: this.services,
        });
        this.bindings.push({
          nodeId: node.id,
          componentId: component.id,
          scriptId: component.scriptId,
          instance,
        });
      }
    }
  }

  getInstanceCount(): number {
    return this.bindings.length;
  }

  /**
   * Future gameplay loop entry. Safe no-op until games register `update`.
   */
  tick(dt: number): void {
    for (const binding of this.bindings) {
      binding.instance.update?.(dt);
    }
  }
}

export type { EventBus };
