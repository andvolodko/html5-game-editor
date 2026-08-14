import { useEffect, useRef, useState } from "react";
import type { AssetRecord } from "@game-editor/assets";
import type { Editor } from "@game-editor/editor-core";

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes)}:${String(remainder).padStart(2, "0")}`;
}

export function AudioAssetPreview({
  asset,
  editor,
}: {
  asset: AssetRecord;
  editor: Editor;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = editor.assets.getContentUrl(asset.id);
  const mimeType =
    asset.metadata.kind === "audio" ? asset.metadata.mimeType : undefined;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !url) {
      return;
    }
    const onTimeUpdate = (): void => {
      setCurrentTime(element.currentTime);
    };
    const onDuration = (): void => {
      if (Number.isFinite(element.duration)) {
        setDuration(element.duration);
      }
    };
    const onPlay = (): void => {
      setPlaying(true);
    };
    const onPause = (): void => {
      setPlaying(false);
    };
    const onEnded = (): void => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onError = (): void => {
      setLoadError("Failed to load audio.");
      setPlaying(false);
    };
    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("loadedmetadata", onDuration);
    element.addEventListener("durationchange", onDuration);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    element.load();
    return () => {
      element.pause();
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("loadedmetadata", onDuration);
      element.removeEventListener("durationchange", onDuration);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
    };
  }, [url]);

  const togglePlayback = (): void => {
    const element = audioRef.current;
    if (!element) {
      return;
    }
    if (playing) {
      element.pause();
      return;
    }
    void element.play().catch(() => {
      setLoadError("Playback was blocked. Click Play again.");
    });
  };

  const seek = (next: number): void => {
    const element = audioRef.current;
    if (!element || !Number.isFinite(next)) {
      return;
    }
    element.currentTime = next;
    setCurrentTime(next);
  };

  return (
    <div className="asset-live-preview">
      <div className="asset-live-preview-label">Audio</div>
      {url ? (
        <>
          {mimeType ? (
            <div className="asset-preview-kind">{mimeType}</div>
          ) : null}
          <audio ref={audioRef} src={url} preload="metadata" />
          {loadError ? <p className="panel-error">{loadError}</p> : null}
          <div className="asset-audio-player">
            <button type="button" onClick={togglePlayback}>
              {playing ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.05}
              value={Math.min(currentTime, duration)}
              disabled={duration <= 0}
              aria-label="Seek"
              onChange={(event) => {
                seek(Number(event.target.value));
              }}
            />
            <span className="asset-audio-time">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </span>
          </div>
        </>
      ) : (
        <p className="panel-error">Unable to resolve audio URL.</p>
      )}
    </div>
  );
}
