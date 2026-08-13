import { afterEach, describe, expect, it, vi } from "vitest";
import { createHtmlAudioPlayer } from "./html-audio-player.js";

class FakeAudio {
  src: string;
  loop = false;
  volume = 1;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(url: string) {
    this.src = url;
  }
}

describe("createHtmlAudioPlayer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays a one-shot clip at the requested volume", () => {
    const created: FakeAudio[] = [];
    vi.stubGlobal(
      "Audio",
      class extends FakeAudio {
        constructor(url: string) {
          super(url);
          created.push(this);
        }
      },
    );
    const player = createHtmlAudioPlayer((id) =>
      id === "asset_sfx" ? "https://example/sfx.ogg" : undefined,
    );
    player.play("asset_sfx", { volume: 0.3 });
    expect(created).toHaveLength(1);
    expect(created[0]?.volume).toBe(0.3);
    expect(created[0]?.loop).toBe(false);
    expect(created[0]?.play).toHaveBeenCalledTimes(1);
  });

  it("loops and stops background audio by asset id", () => {
    const created: FakeAudio[] = [];
    vi.stubGlobal(
      "Audio",
      class extends FakeAudio {
        constructor(url: string) {
          super(url);
          created.push(this);
        }
      },
    );
    const player = createHtmlAudioPlayer((id) => `https://example/${id}.ogg`);
    player.play("asset_bgm", { loop: true, volume: 0.5 });
    expect(created[0]?.loop).toBe(true);
    expect(created[0]?.volume).toBe(0.5);
    player.stop("asset_bgm");
    expect(created[0]?.pause).toHaveBeenCalledTimes(1);
    expect(created[0]?.src).toBe("");
  });

  it("ignores missing asset urls", () => {
    vi.stubGlobal("Audio", FakeAudio);
    const player = createHtmlAudioPlayer(() => undefined);
    player.play("missing");
  });
});
