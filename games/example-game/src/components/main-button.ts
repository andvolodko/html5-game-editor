import {
  defineComponent,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const CLICK_LOG_MESSAGE = "test message";

/** Live instance — logs a test message when the host node is clicked. */
export class MainButtonBehaviour implements ScriptInstance {
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.onEnable();
  }

  private onEnable(): void {
    const { onNodeClick } = this.ctx.services;
    if (!onNodeClick) {
      return;
    }
    this.unsubscribers.push(
      onNodeClick(this.ctx.nodeId, () => {
        console.log(CLICK_LOG_MESSAGE);
      }),
    );
  }

  destroy(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }
}

export const mainButtonComponent = defineComponent({
  id: "example.MainButton",
  displayName: "Main Button",
  category: "UI",
  categoryOrder: 20,
  order: 20,
  allowMultiple: false,
  properties: {},
  create: (ctx) => new MainButtonBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installMainButtonRuntime(registry: ComponentRegistry): void {
  const existing = registry.get(mainButtonComponent.id);
  if (existing && mainButtonComponent.create) {
    existing.create = mainButtonComponent.create;
  }
}
