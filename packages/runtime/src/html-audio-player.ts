import type { PlayAudioOptions } from "@game-editor/game-components";

function clampVolume(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

function tryPlay(audio: HTMLAudioElement): void {
  void audio.play().catch(() => {
    // Autoplay policy / decode errors — ignore for gameplay audio.
  });
}

export interface HtmlAudioPlayerHandle {
  play(assetId: string, options?: PlayAudioOptions): void;
  stop(assetId?: string): void;
  /** Mute/unmute looping audio. Enabling retries clips blocked by autoplay. */
  setEnabled(enabled: boolean): void;
  /** Preview/runtime pause. Holds looping clips without dropping them. */
  setPaused(paused: boolean): void;
}

/**
 * Browser HTMLAudioElement player for catalogue audio assets.
 * Ignores missing URLs and autoplay rejections.
 */
export function createHtmlAudioPlayer(
  resolveAssetUrl: (assetId: string) => string | undefined,
): HtmlAudioPlayerHandle {
  const looping = new Map<string, HTMLAudioElement>();
  let enabled = true;
  let paused = false;

  const canAudiblyPlay = (): boolean => enabled && !paused;

  const pauseLooping = (): void => {
    for (const audio of looping.values()) {
      audio.pause();
    }
  };

  const resumeLooping = (): void => {
    if (!canAudiblyPlay()) {
      return;
    }
    for (const audio of looping.values()) {
      tryPlay(audio);
    }
  };

  const stopOne = (assetId: string): void => {
    const audio = looping.get(assetId);
    if (!audio) {
      return;
    }
    audio.pause();
    audio.src = "";
    looping.delete(assetId);
  };

  return {
    play(assetId, options) {
      const url = resolveAssetUrl(assetId);
      if (!url || typeof Audio === "undefined") {
        return;
      }
      const volume = clampVolume(options?.volume);
      if (options?.loop) {
        stopOne(assetId);
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = volume;
        looping.set(assetId, audio);
        if (canAudiblyPlay()) {
          tryPlay(audio);
        }
        return;
      }
      if (!canAudiblyPlay()) {
        return;
      }
      const audio = new Audio(url);
      audio.volume = volume;
      tryPlay(audio);
    },
    stop(assetId) {
      if (assetId !== undefined) {
        stopOne(assetId);
        return;
      }
      for (const id of [...looping.keys()]) {
        stopOne(id);
      }
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (!enabled) {
        pauseLooping();
        return;
      }
      resumeLooping();
    },
    setPaused(nextPaused) {
      paused = nextPaused;
      if (paused) {
        pauseLooping();
        return;
      }
      resumeLooping();
    },
  };
}
