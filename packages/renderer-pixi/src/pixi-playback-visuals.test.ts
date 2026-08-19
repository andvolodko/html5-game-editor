import { describe, expect, it } from "vitest";
import { AnimatedSprite, Texture, type Ticker } from "pixi.js";
import {
  createAnimatedSpriteComponent,
  createNodeWithVisual,
} from "@game-editor/scene";
import {
  advanceHostDrivenVisuals,
  detachSharedTickerVisuals,
} from "./pixi-playback-visuals.js";

function fakeTicker(deltaTime: number): Ticker {
  const DEFAULT_FPS = 60;
  return {
    deltaTime,
    deltaMS: (deltaTime * 1000) / DEFAULT_FPS,
  } as Ticker;
}

describe("pixi playback visuals", () => {
  it("disconnects AnimatedSprite from Ticker.shared", () => {
    const view = new AnimatedSprite({
      textures: [Texture.EMPTY, Texture.EMPTY],
      autoPlay: false,
      autoUpdate: true,
    });
    expect(view.autoUpdate).toBe(true);

    const node = createNodeWithVisual(
      "Ase",
      { x: 0, y: 0 },
      createAnimatedSpriteComponent({ playing: true }),
    );
    detachSharedTickerVisuals([{ visual: view, node }]);
    expect(view.autoUpdate).toBe(false);
    view.destroy();
  });

  it("advances a playing AnimatedSprite from the host ticker", () => {
    const view = new AnimatedSprite({
      textures: [Texture.EMPTY, Texture.EMPTY],
      autoPlay: false,
      autoUpdate: false,
    });
    view.play();
    const node = createNodeWithVisual(
      "Ase",
      { x: 0, y: 0 },
      createAnimatedSpriteComponent({ playing: true }),
    );
    expect(view.currentFrame).toBe(0);
    advanceHostDrivenVisuals([{ visual: view, node }], fakeTicker(1));
    expect(view.currentFrame).toBe(1);
    view.destroy();
  });
});
