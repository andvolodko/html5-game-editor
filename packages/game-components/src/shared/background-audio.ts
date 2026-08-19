import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";

const DEFAULT_VOLUME = 1;

type Props = {
  audioAssetId: string;
  volume: number;
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(1, Math.max(0, value));
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    audioAssetId:
      typeof raw.audioAssetId === "string" ? raw.audioAssetId : "",
    volume:
      typeof raw.volume === "number"
        ? clampVolume(raw.volume)
        : DEFAULT_VOLUME,
  };
}

/**
 * Loops a catalogue audio asset for the lifetime of the host node
 * (preview / runtime). Volume is linear 0–1.
 */
export class BackgroundAudioBehaviour implements ScriptInstance {
  private audioAssetId = "";
  private volume = DEFAULT_VOLUME;
  private readonly ctx: ScriptCreateContext;

  constructor(ctx: ScriptCreateContext) {
    this.ctx = ctx;
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.play();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const previousAssetId = this.audioAssetId;
    this.applyProperties(properties);
    if (previousAssetId && previousAssetId !== this.audioAssetId) {
      this.ctx.services.stopAudio?.(previousAssetId);
    }
    this.play();
  }

  destroy(): void {
    if (!this.audioAssetId) {
      return;
    }
    this.ctx.services.stopAudio?.(this.audioAssetId);
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.audioAssetId = props.audioAssetId;
    this.volume = props.volume;
  }

  private play(): void {
    if (!this.audioAssetId || !this.ctx.services.playAudio) {
      return;
    }
    this.ctx.services.playAudio(this.audioAssetId, {
      loop: true,
      volume: this.volume,
    });
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  audioAssetId: {
    kind: "asset",
    assetType: "audio",
    default: "",
  },
  volume: {
    kind: "number",
    default: DEFAULT_VOLUME,
    min: 0,
    max: 1,
    step: 0.05,
  },
};

export const backgroundAudioComponent = defineComponent({
  id: "shared.BackgroundAudio",
  displayName: "Background Audio",
  category: "Audio",
  categoryOrder: 15,
  order: 20,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new BackgroundAudioBehaviour(ctx),
});
