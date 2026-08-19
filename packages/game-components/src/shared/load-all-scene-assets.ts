import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";

const PERCENT_COMPLETE = 100;
const PERCENT_PLACEHOLDER = "{percent}";
const DEFAULT_TEMPLATE = "{percent}%";
const DEFAULT_COMPLETE_EVENT = "loading.complete";

type Props = {
  completeEvent: string;
  template: string;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    completeEvent:
      typeof raw.completeEvent === "string" && raw.completeEvent.length > 0
        ? raw.completeEvent
        : DEFAULT_COMPLETE_EVENT,
    template:
      typeof raw.template === "string" && raw.template.length > 0
        ? raw.template
        : DEFAULT_TEMPLATE,
  };
}

/** Replaces `{percent}` in the inspector template with an integer 0–100. */
export function formatLoadAllSceneAssetsText(
  template: string,
  percent: number,
): string {
  return template.replaceAll(PERCENT_PLACEHOLDER, String(percent));
}

function percentForProgress(loaded: number, total: number): number {
  if (total <= 0) {
    return PERCENT_COMPLETE;
  }
  return Math.min(
    PERCENT_COMPLETE,
    Math.round((loaded / total) * PERCENT_COMPLETE),
  );
}

async function downloadUrl(url: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  await response.arrayBuffer();
}

/**
 * Preloads every bundled scene asset via the host (`preloadSceneAsset` →
 * Pixi Assets / Three glTF cache), writes load percent onto the host
 * Text / HTMLText / BitmapText, then emits `completeEvent`.
 */
export class LoadAllSceneAssetsBehaviour implements ScriptInstance {
  private completeEvent = DEFAULT_COMPLETE_EVENT;
  private template = DEFAULT_TEMPLATE;
  private readonly abort = new AbortController();
  private finished = false;
  private lastText = "";
  private started = false;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.writePercent(0);
    void this.run();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  destroy(): void {
    this.finished = true;
    this.abort.abort();
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.completeEvent = props.completeEvent;
    this.template = props.template;
  }

  private writePercent(percent: number): void {
    const setText = this.ctx.services.setText;
    if (!setText) {
      return;
    }
    const nextText = formatLoadAllSceneAssetsText(this.template, percent);
    if (nextText === this.lastText) {
      return;
    }
    this.lastText = nextText;
    setText(this.ctx.nodeId, nextText);
  }

  private finish(): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.writePercent(PERCENT_COMPLETE);
    this.ctx.services.bus.emit(this.completeEvent);
  }

  private async preloadOne(assetId: string): Promise<void> {
    const { preloadSceneAsset, resolveAssetUrl } = this.ctx.services;
    if (preloadSceneAsset) {
      await preloadSceneAsset(assetId, this.abort.signal);
      return;
    }
    const url = resolveAssetUrl?.(assetId);
    if (!url) {
      return;
    }
    await downloadUrl(url, this.abort.signal);
  }

  private async run(): Promise<void> {
    const list = this.ctx.services.listAllSceneAssetIds;
    let assetIds: readonly string[] = [];
    try {
      assetIds = list ? await list() : [];
    } catch (error) {
      if (this.abort.signal.aborted) {
        return;
      }
      console.warn("[LoadAllSceneAssets] failed to list scene assets", error);
      this.finish();
      return;
    }

    if (this.abort.signal.aborted) {
      return;
    }

    if (assetIds.length === 0) {
      this.finish();
      return;
    }

    let loaded = 0;
    await Promise.all(
      assetIds.map(async (assetId) => {
        try {
          await this.preloadOne(assetId);
        } catch (error) {
          if (this.abort.signal.aborted) {
            return;
          }
          console.warn("[LoadAllSceneAssets] failed to preload", assetId, error);
        }
        if (this.abort.signal.aborted) {
          return;
        }
        loaded += 1;
        this.writePercent(percentForProgress(loaded, assetIds.length));
      }),
    );

    if (this.abort.signal.aborted) {
      return;
    }
    this.finish();
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  completeEvent: {
    kind: "dynamicEnum",
    default: DEFAULT_COMPLETE_EVENT,
    source: "busEvents",
  },
  template: {
    kind: "string",
    default: DEFAULT_TEMPLATE,
  },
};

export const loadAllSceneAssetsComponent = defineComponent({
  id: "shared.LoadAllSceneAssets",
  displayName: "Load All Scene Assets",
  category: "Scene",
  categoryOrder: 5,
  order: 15,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new LoadAllSceneAssetsBehaviour(ctx),
});
