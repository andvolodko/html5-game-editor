import type { SpineAssetUrls } from "@game-editor/assets";
import {
  fitDisplayInPreview,
  mountAssetPreviewHost,
  type AssetPreviewHost,
} from "./asset-preview-host.js";
import { applySpinePlayback, loadSpine } from "./load-spine.js";

export interface SpinePreviewHandle {
  setSkin(name: string | undefined): void;
  setAnimation(name: string | undefined): void;
  setPlaying(playing: boolean): void;
  destroy(): void;
}

/**
 * Tiny Pixi host for the Asset Preview panel.
 * Reuses the same Spine loader as scene painters.
 */
export async function mountSpinePreview(options: {
  parent: HTMLElement;
  urls: SpineAssetUrls;
  skin?: string;
  animation?: string;
  playing: boolean;
}): Promise<SpinePreviewHandle> {
  const host: AssetPreviewHost = await mountAssetPreviewHost(options.parent);
  let view;
  try {
    view = await loadSpine(options.urls);
  } catch (error) {
    host.destroy();
    throw error;
  }
  let skin = options.skin;
  let animation = options.animation;
  let playing = options.playing;

  const playback = (): void => {
    applySpinePlayback(view, {
      skin,
      animation,
      loop: true,
      timeScale: 1,
      playing,
    });
  };

  const layout = (): void => {
    view.scale.set(1);
    view.position.set(0, 0);
    view.update(0);
    const bounds = view.getLocalBounds();
    const { width: viewW, height: viewH } = host.size();
    const fit = fitDisplayInPreview(
      { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      viewW,
      viewH,
    );
    view.scale.set(fit.scale);
    view.position.set(fit.x, fit.y);
  };

  playback();
  host.app.stage.addChild(view);
  layout();
  host.onResize(layout);

  return {
    setSkin(name) {
      skin = name;
      playback();
      layout();
    },
    setAnimation(name) {
      animation = name;
      playback();
      layout();
    },
    setPlaying(next) {
      playing = next;
      view.autoUpdate = next;
      if (!next) {
        view.update(0);
      }
    },
    destroy() {
      view.removeFromParent();
      view.destroy({ children: true, texture: false, textureSource: false });
      host.destroy();
    },
  };
}
