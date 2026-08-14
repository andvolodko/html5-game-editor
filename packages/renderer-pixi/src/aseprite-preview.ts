import { AnimatedSprite, Sprite } from "pixi.js";
import {
  mountAssetPreviewHost,
  type AssetPreviewHost,
} from "./asset-preview-host.js";
import {
  loadPixiSpritesheet,
  spritesheetTextures,
} from "./load-pixi-spritesheet.js";

export interface AsepritePreviewHandle {
  setAnimation(name: string | undefined): Promise<void>;
  setPlaying(playing: boolean): void;
  destroy(): void;
}

/**
 * Tiny Pixi host for the Asset Preview panel.
 * Reuses the same spritesheet loader as scene painters.
 */
export async function mountAsepritePreview(options: {
  parent: HTMLElement;
  jsonUrl: string;
  animation?: string;
  playing: boolean;
}): Promise<AsepritePreviewHandle> {
  const host: AssetPreviewHost = await mountAssetPreviewHost(options.parent);
  let view: Sprite | AnimatedSprite | undefined;
  let playing = options.playing;

  const layout = (display: Sprite | AnimatedSprite): void => {
    const { width: viewW, height: viewH } = host.size();
    display.position.set(viewW / 2, viewH / 2);
    const bounds = display.getLocalBounds();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const scale = Math.min((viewW * 0.8) / width, (viewH * 0.8) / height);
    display.scale.set(scale);
  };

  const applySize = (): void => {
    if (view) {
      layout(view);
    }
  };

  host.onResize(applySize);

  const show = async (animation: string | undefined): Promise<void> => {
    const sheet = await loadPixiSpritesheet(options.jsonUrl);
    const textures = spritesheetTextures(sheet, animation);
    const first = textures[0];
    if (!first) {
      return;
    }
    if (view) {
      view.destroy();
      view = undefined;
    }
    if (textures.length > 1) {
      const animated = new AnimatedSprite({ textures, autoPlay: false });
      animated.anchor.set(0.5);
      animated.animationSpeed = 1;
      animated.loop = true;
      layout(animated);
      if (playing) {
        animated.play();
      } else {
        animated.gotoAndStop(0);
      }
      host.app.stage.addChild(animated);
      view = animated;
      return;
    }
    const sprite = new Sprite(first);
    sprite.anchor.set(0.5);
    layout(sprite);
    host.app.stage.addChild(sprite);
    view = sprite;
  };

  await show(options.animation);
  applySize();

  return {
    async setAnimation(name) {
      await show(name);
    },
    setPlaying(next) {
      playing = next;
      if (view instanceof AnimatedSprite) {
        if (next) {
          view.play();
        } else {
          view.stop();
        }
      }
    },
    destroy() {
      view = undefined;
      host.destroy();
    },
  };
}
