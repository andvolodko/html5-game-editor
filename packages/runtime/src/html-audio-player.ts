import type { PlayAudioOptions } from "@game-editor/game-components";

function clampVolume(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

export interface HtmlAudioPlayerHandle {
  play(assetId: string, options?: PlayAudioOptions): void;
  stop(assetId?: string): void;
}

/**
 * Browser HTMLAudioElement player for catalogue audio assets.
 * Ignores missing URLs and autoplay rejections.
 */
export function createHtmlAudioPlayer(
  resolveAssetUrl: (assetId: string) => string | undefined,
): HtmlAudioPlayerHandle {
  const looping = new Map<string, HTMLAudioElement>();

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
        void audio.play().catch(() => {
          // Autoplay policy / decode errors — ignore for gameplay audio.
        });
        return;
      }
      const audio = new Audio(url);
      audio.volume = volume;
      void audio.play().catch(() => {
        // Autoplay policy / decode errors — ignore for gameplay SFX.
      });
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
  };
}
