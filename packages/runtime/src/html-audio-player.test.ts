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

  it("pauses looping audio when disabled and retries play when enabled", () => {
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
    player.play("asset_bgm", { loop: true });
    expect(created[0]?.play).toHaveBeenCalledTimes(1);

    player.setEnabled(false);
    expect(created[0]?.pause).toHaveBeenCalledTimes(1);
    expect(created[0]?.src).toBe("https://example/asset_bgm.ogg");

    player.setEnabled(true);
    expect(created[0]?.play).toHaveBeenCalledTimes(2);
  });

  it("retries looping play when enabled after an autoplay block", () => {
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
    player.play("asset_bgm", { loop: true });
    expect(created[0]?.play).toHaveBeenCalledTimes(1);

    player.setEnabled(true);
    expect(created[0]?.play).toHaveBeenCalledTimes(2);
  });

  it("pauses looping audio and skips one-shots until resumed", () => {
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
    player.play("asset_bgm", { loop: true });
    expect(created[0]?.play).toHaveBeenCalledTimes(1);

    player.setPaused(true);
    expect(created[0]?.pause).toHaveBeenCalledTimes(1);
    expect(created[0]?.src).toBe("https://example/asset_bgm.ogg");

    player.play("asset_sfx");
    expect(created).toHaveLength(1);

    player.setPaused(false);
    expect(created[0]?.play).toHaveBeenCalledTimes(2);
  });

  it("does not resume looping audio when enabled while paused", () => {
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
    player.play("asset_bgm", { loop: true });
    player.setPaused(true);
    player.setEnabled(true);
    expect(created[0]?.play).toHaveBeenCalledTimes(1);
  });

  it("skips one-shots while disabled and does not play looping clips until enabled", () => {
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
    player.setEnabled(false);
    player.play("asset_sfx");
    expect(created).toHaveLength(0);

    player.play("asset_bgm", { loop: true });
    expect(created).toHaveLength(1);
    expect(created[0]?.play).not.toHaveBeenCalled();

    player.setEnabled(true);
    expect(created[0]?.play).toHaveBeenCalledTimes(1);
  });
});
