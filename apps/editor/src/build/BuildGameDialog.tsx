import { useEffect, useMemo, useRef, useState } from "react";
import {
  createFetchBuildApiClient,
  type BuildFormat,
  type BuildIssueDto,
  type BuildPlatform,
  type BuildProgressEventDto,
  type BuildType,
} from "@game-editor/editor-core";
import { isDemoMode } from "../demo/demo-mode";

const PROJECT_SERVER_API_BASE = "/api";

const STAGE_LABELS: Record<string, string> = {
  validating: "Validating project",
  "building-web": "Building Web game",
  "preparing-android": "Preparing Android project",
  "syncing-capacitor": "Synchronizing Capacitor",
  "running-gradle": "Running Gradle",
  finalizing: "Finalizing artifact",
};

export function BuildGameDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const logRef = useRef<HTMLTextAreaElement | null>(null);
  const demo = isDemoMode();
  const client = useMemo(
    () => createFetchBuildApiClient(PROJECT_SERVER_API_BASE),
    [],
  );

  const [platform, setPlatform] = useState<BuildPlatform>("android");
  const [buildType, setBuildType] = useState<BuildType>("debug");
  const [format, setFormat] = useState<BuildFormat>("apk");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BuildProgressEventDto | null>(null);
  const [issues, setIssues] = useState<BuildIssueDto[]>([]);
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  const [artifactAbsolutePath, setArtifactAbsolutePath] = useState<string | null>(
    null,
  );
  const [logPath, setLogPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealStatus, setRevealStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, busy]);

  useEffect(() => {
    if (platform === "web") {
      setFormat("web");
      return;
    }
    if (buildType === "debug") {
      setFormat("apk");
      return;
    }
    setFormat("aab");
  }, [platform, buildType]);

  const logText = formatBuildLog(issues, error, revealStatus);

  useEffect(() => {
    const el = logRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logText]);

  if (!open) {
    return null;
  }

  const androidDisabled = demo;

  const clearBuildResult = (): void => {
    setProgress(null);
    setIssues([]);
    setArtifactPath(null);
    setArtifactAbsolutePath(null);
    setLogPath(null);
    setError(null);
    setRevealStatus(null);
    setCopyStatus(null);
  };

  const selectPlatform = (next: BuildPlatform): void => {
    if (next === platform) {
      return;
    }
    setPlatform(next);
    clearBuildResult();
  };

  const runBuild = (): void => {
    setBusy(true);
    setError(null);
    setRevealStatus(null);
    setCopyStatus(null);
    setIssues([]);
    setArtifactPath(null);
    setArtifactAbsolutePath(null);
    setLogPath(null);
    setProgress({ stage: "validating", message: "Starting build…" });

    const requestPlatform: BuildPlatform =
      platform === "android" && androidDisabled ? "web" : platform;

    void client
      .build(
        {
          platform: requestPlatform,
          mode: "production",
          format: requestPlatform === "web" ? "web" : format,
          buildType: requestPlatform === "web" ? "debug" : buildType,
        },
        (event) => {
          setProgress(event);
        },
      )
      .then((result) => {
        setIssues(result.issues);
        setLogPath(result.logPath ?? null);
        if (result.ok) {
          const artifact = result.artifacts[0];
          setArtifactPath(artifact?.path ?? null);
          setArtifactAbsolutePath(artifact?.absolutePath ?? null);
          setProgress({
            stage: "finalizing",
            message: "Build complete",
            progress: 1,
          });
        } else {
          setError(
            result.issues.find((i) => i.severity === "error")?.message ??
              "Build failed",
          );
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Build failed");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const openOutput = (relativePath: string): void => {
    setRevealStatus("Opening…");
    setError(null);
    void client
      .reveal(relativePath)
      .then(() => {
        setRevealStatus(`Opened ${relativePath}`);
      })
      .catch((err: unknown) => {
        setRevealStatus(null);
        setError(err instanceof Error ? err.message : "Could not open folder");
      });
  };

  const copyArtifactPath = (): void => {
    const value = artifactAbsolutePath ?? artifactPath;
    if (!value) {
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => {
        setCopyStatus("Copied");
        window.setTimeout(() => {
          setCopyStatus((current) => (current === "Copied" ? null : current));
        }, 1500);
      },
      () => {
        setError("Could not copy path to clipboard");
      },
    );
  };

  const stageLabel =
    progress !== null
      ? (STAGE_LABELS[progress.stage] ?? progress.message)
      : null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-dialog-preferences"
        role="dialog"
        aria-modal="true"
        aria-labelledby="build-game-title"
      >
        <h2 id="build-game-title">Build Game</h2>

        <section className="preferences-section" aria-labelledby="platform-heading">
          <h3 id="platform-heading">Platform</h3>
          <label className="inspector-checkbox">
            <input
              type="radio"
              name="build-platform"
              checked={platform === "web"}
              disabled={busy}
              onChange={() => selectPlatform("web")}
            />
            Web
          </label>
          <label className="inspector-checkbox">
            <input
              type="radio"
              name="build-platform"
              checked={platform === "android"}
              disabled={busy || androidDisabled}
              onChange={() => selectPlatform("android")}
            />
            Android
          </label>
          {androidDisabled ? (
            <p className="preferences-section-hint">
              Android builds require the live editor with project-server (not
              available in demo mode).
            </p>
          ) : null}
        </section>

        {platform === "android" ? (
          <>
            <section
              className="preferences-section"
              aria-labelledby="build-type-heading"
            >
              <h3 id="build-type-heading">Build Type</h3>
              <label className="inspector-checkbox">
                <input
                  type="radio"
                  name="build-type"
                  checked={buildType === "debug"}
                  disabled={busy}
                  onChange={() => setBuildType("debug")}
                />
                Debug
              </label>
              <label className="inspector-checkbox">
                <input
                  type="radio"
                  name="build-type"
                  checked={buildType === "release"}
                  disabled={busy}
                  onChange={() => setBuildType("release")}
                />
                Release
              </label>
              {buildType === "release" ? (
                <p className="preferences-section-hint">
                  Requires keystore path/alias in Project Settings and local
                  passwords in .editor/android-secrets.json.
                </p>
              ) : null}
            </section>

            <section
              className="preferences-section"
              aria-labelledby="output-heading"
            >
              <h3 id="output-heading">Output</h3>
              <label className="inspector-checkbox">
                <input
                  type="radio"
                  name="build-format"
                  checked={format === "apk"}
                  disabled={busy}
                  onChange={() => setFormat("apk")}
                />
                APK
              </label>
              <label className="inspector-checkbox">
                <input
                  type="radio"
                  name="build-format"
                  checked={format === "aab"}
                  disabled={busy || buildType === "debug"}
                  onChange={() => setFormat("aab")}
                />
                AAB (Google Play)
              </label>
              {buildType === "release" ? (
                <p className="preferences-section-hint">
                  AAB is the preferred Google Play upload format.
                </p>
              ) : null}
            </section>
          </>
        ) : null}

        {stageLabel ? (
          <p className="panel-hint" aria-live="polite">
            {stageLabel}
            {progress?.message && progress.message !== stageLabel
              ? ` — ${progress.message}`
              : ""}
          </p>
        ) : null}

        {artifactPath ? (
          <div className="build-output-path">
            <label className="build-output-path-label" htmlFor="build-output-path">
              Output path
            </label>
            <div className="build-output-path-row">
              <input
                id="build-output-path"
                className="build-output-path-input"
                type="text"
                readOnly
                value={artifactAbsolutePath ?? artifactPath}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
              />
              <button
                type="button"
                className="build-output-copy-btn"
                title="Copy path"
                aria-label="Copy path"
                onClick={copyArtifactPath}
              >
                <CopyPathIcon />
              </button>
            </div>
            {copyStatus ? (
              <p className="panel-hint" aria-live="polite">
                {copyStatus}
              </p>
            ) : null}
          </div>
        ) : null}

        {logText.length > 0 ? (
          <div className="build-log">
            <label className="build-output-path-label" htmlFor="build-log">
              Build log
            </label>
            <textarea
              id="build-log"
              ref={logRef}
              className="build-log-text"
              readOnly
              spellCheck={false}
              value={logText}
            />
          </div>
        ) : null}

        <div className="modal-actions">
          {artifactPath ? (
            <button
              type="button"
              onClick={() => {
                openOutput(artifactPath);
              }}
            >
              Open output folder
            </button>
          ) : null}
          {logPath ? (
            <button
              type="button"
              onClick={() => {
                openOutput(logPath);
              }}
            >
              Open build log
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || (platform === "android" && androidDisabled)}
            onClick={runBuild}
          >
            {busy ? "Building…" : "Build"}
          </button>
          <button
            ref={closeRef}
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBuildLog(
  issues: readonly BuildIssueDto[],
  error: string | null,
  revealStatus: string | null,
): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string): void => {
    if (line.length === 0 || seen.has(line)) {
      return;
    }
    seen.add(line);
    lines.push(line);
  };
  for (const issue of issues) {
    push(`${issue.severity} ${issue.code}: ${issue.message}`);
  }
  if (error) {
    push(error);
  }
  if (revealStatus) {
    push(revealStatus);
  }
  return lines.join("\n\n");
}

function CopyPathIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
