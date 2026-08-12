/**
 * Browser HTMLAudioElement player for catalogue audio assets.
 * Ignores missing URLs and autoplay rejections.
 */
export function createHtmlAudioPlayer(
  resolveAssetUrl: (assetId: string) => string | undefined,
): (assetId: string) => void {
  return (assetId: string): void => {
    const url = resolveAssetUrl(assetId);
    if (!url || typeof Audio === "undefined") {
      return;
    }
    const audio = new Audio(url);
    void audio.play().catch(() => {
      // Autoplay policy / decode errors — ignore for gameplay SFX.
    });
  };
}
