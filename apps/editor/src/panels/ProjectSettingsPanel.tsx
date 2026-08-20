import { useEffect, useMemo, useState } from "react";
import {
  createFetchBuildApiClient,
  uniquePanelErrorMessages,
  type SceneListEntry,
} from "@game-editor/editor-core";
import {
  ANDROID_APPLICATION_ID_PATTERN,
  ANDROID_ICON_RECOMMENDED_SIZE,
  ANDROID_SPLASH_RECOMMENDED_SIZE,
  createDefaultAndroidBuildSettings,
  DEFAULT_PROJECT_BACKGROUND,
  DEFAULT_PROJECT_SCALE_MODE,
  type AndroidBuildSettings,
  type AndroidOrientation,
} from "@game-editor/project";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { InspectorFieldRow, AssetSelectField } from "./fields/inspector-fields";
import { ProjectBackgroundField } from "./ProjectBackgroundField";
import { buildStartSceneSelectOptions } from "./fields/start-scene-select-options";
import { isDemoMode } from "../demo/demo-mode";

const RESOLUTION_MIN = 1;
const VERSION_CODE_MIN = 1;
const PROJECT_SERVER_API_BASE = "/api";

function resolveAndroid(
  project: {
    name: string;
    displayName: string;
    android?: AndroidBuildSettings;
  },
): AndroidBuildSettings {
  return (
    project.android ??
    createDefaultAndroidBuildSettings(project.displayName, project.name)
  );
}

export function ProjectSettingsPanel() {
  const editor = useEditor();
  const project = useEditorState((ed) => ed.project.getProject());
  const status = useEditorState((ed) => ed.project.getStatus());
  const projectError = useEditorState((ed) => ed.project.getError());
  const projectRevision = useEditorState((ed) => ed.project.getRevision());
  const [scenes, setScenes] = useState<SceneListEntry[]>([]);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [widthDraft, setWidthDraft] = useState("");
  const [heightDraft, setHeightDraft] = useState("");
  const [backgroundDraft, setBackgroundDraft] = useState(
    DEFAULT_PROJECT_BACKGROUND,
  );
  const [androidDraft, setAndroidDraft] = useState<AndroidBuildSettings | null>(
    null,
  );
  const [keystorePasswordDraft, setKeystorePasswordDraft] = useState("");
  const [keyPasswordDraft, setKeyPasswordDraft] = useState("");
  const [secretsConfigured, setSecretsConfigured] = useState(false);
  const [secretsStatus, setSecretsStatus] = useState<string | null>(null);
  const buildClient = useMemo(
    () => createFetchBuildApiClient(PROJECT_SERVER_API_BASE),
    [],
  );
  const demo = isDemoMode();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!editor.project.getProject()) {
          await editor.project.refresh();
        }
      } catch {
        // Surfaced via ProjectManager error.
      }
      try {
        const listed = await editor.listScenes();
        if (!cancelled) {
          setScenes(listed);
          setScenesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setScenesError(
            error instanceof Error ? error.message : "Failed to list scenes",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editor, projectRevision]);

  useEffect(() => {
    if (!project) {
      setWidthDraft("");
      setHeightDraft("");
      setBackgroundDraft(DEFAULT_PROJECT_BACKGROUND);
      setAndroidDraft(null);
      return;
    }
    setWidthDraft(String(project.resolution.width));
    setHeightDraft(String(project.resolution.height));
    setBackgroundDraft(project.background);
    setAndroidDraft(resolveAndroid(project));
  }, [project, projectRevision]);

  useEffect(() => {
    if (!project || demo) {
      return;
    }
    let cancelled = false;
    void buildClient
      .getAndroidSecretsStatus()
      .then((status) => {
        if (!cancelled) {
          setSecretsConfigured(status.configured);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSecretsConfigured(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [project, projectRevision, buildClient, demo]);

  const options = buildStartSceneSelectOptions(
    scenes,
    project?.startScene,
  );
  const busy = status === "loading" || status === "saving";

  const commitResolution = (): void => {
    if (!project) {
      return;
    }
    const width = Number.parseInt(widthDraft, 10);
    const height = Number.parseInt(heightDraft, 10);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < RESOLUTION_MIN ||
      height < RESOLUTION_MIN
    ) {
      setWidthDraft(String(project.resolution.width));
      setHeightDraft(String(project.resolution.height));
      setSaveError("Resolution width and height must be positive integers");
      return;
    }
    if (
      width === project.resolution.width &&
      height === project.resolution.height
    ) {
      return;
    }
    setSaveError(null);
    void editor.project.setResolution(width, height).catch((error: unknown) => {
      setWidthDraft(String(project.resolution.width));
      setHeightDraft(String(project.resolution.height));
      setSaveError(error instanceof Error ? error.message : "Save failed");
    });
  };

  const commitAndroid = (next: AndroidBuildSettings): void => {
    if (!project) {
      return;
    }
    if (next.appName.trim().length === 0) {
      setSaveError("Android app name is required");
      setAndroidDraft(resolveAndroid(project));
      return;
    }
    if (!ANDROID_APPLICATION_ID_PATTERN.test(next.applicationId)) {
      setSaveError(
        "Android application id must be reverse-DNS (e.g. com.example.game)",
      );
      setAndroidDraft(resolveAndroid(project));
      return;
    }
    if (next.versionName.trim().length === 0) {
      setSaveError("Android version name is required");
      setAndroidDraft(resolveAndroid(project));
      return;
    }
    if (
      !Number.isInteger(next.versionCode) ||
      next.versionCode < VERSION_CODE_MIN
    ) {
      setSaveError("Android version code must be a positive integer");
      setAndroidDraft(resolveAndroid(project));
      return;
    }
    setSaveError(null);
    setAndroidDraft(next);
    void editor.project.setAndroidSettings(next).catch((error: unknown) => {
      setAndroidDraft(resolveAndroid(project));
      setSaveError(error instanceof Error ? error.message : "Save failed");
    });
  };

  return (
    <div className="panel panel-project-settings panel-inspector">
      <p className="panel-hint">Project Settings</p>
      {project ? (
        <div className="inspector-grid">
          <label>
            Display Name
            <input value={project.displayName} readOnly disabled />
          </label>
          <label>
            Project Name
            <input value={project.name} readOnly disabled />
          </label>
          <label>
            Start Scene
            <select
              value={project.startScene}
              disabled={busy || options.length === 0}
              onChange={(event) => {
                const next = event.target.value;
                setSaveError(null);
                void editor.project.setStartScene(next).catch((error: unknown) => {
                  setSaveError(
                    error instanceof Error ? error.message : "Save failed",
                  );
                });
              }}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <InspectorFieldRow>
            <label>
              Resolution Width
              <input
                type="number"
                min={RESOLUTION_MIN}
                step={1}
                value={widthDraft}
                disabled={busy}
                onChange={(event) => {
                  setWidthDraft(event.target.value);
                }}
                onBlur={commitResolution}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
            <label>
              Resolution Height
              <input
                type="number"
                min={RESOLUTION_MIN}
                step={1}
                value={heightDraft}
                disabled={busy}
                onChange={(event) => {
                  setHeightDraft(event.target.value);
                }}
                onBlur={commitResolution}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
          </InspectorFieldRow>
          <label>
            Scale Mode
            <select
              value={project.scaleMode ?? DEFAULT_PROJECT_SCALE_MODE}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.value;
                if (next !== "contain" && next !== "cover" && next !== "expand") {
                  return;
                }
                if (next === project.scaleMode) {
                  return;
                }
                setSaveError(null);
                void editor.project.setScaleMode(next).catch((error: unknown) => {
                  setSaveError(
                    error instanceof Error ? error.message : "Save failed",
                  );
                });
              }}
            >
              <option value="expand">Expand (Pixi fills extra space)</option>
              <option value="cover">Cover (crop to fill)</option>
              <option value="contain">Contain (letterbox)</option>
            </select>
          </label>
          <ProjectBackgroundField
            value={backgroundDraft}
            disabled={busy}
            onCommit={(next) => {
              if (!project || next === project.background) {
                setBackgroundDraft(next);
                return;
              }
              setBackgroundDraft(next);
              setSaveError(null);
              void editor.project.setBackground(next).catch((error: unknown) => {
                setBackgroundDraft(project.background);
                setSaveError(
                  error instanceof Error ? error.message : "Save failed",
                );
              });
            }}
          />

          <p className="panel-hint">Android</p>
          {androidDraft ? (
            <>
              <label>
                App Name
                <input
                  value={androidDraft.appName}
                  disabled={busy}
                  onChange={(event) => {
                    setAndroidDraft({
                      ...androidDraft,
                      appName: event.target.value,
                    });
                  }}
                  onBlur={() => {
                    commitAndroid({
                      ...androidDraft,
                      appName: androidDraft.appName.trim(),
                    });
                  }}
                />
              </label>
              <label>
                Package Name / Application ID
                <input
                  value={androidDraft.applicationId}
                  disabled={busy}
                  onChange={(event) => {
                    setAndroidDraft({
                      ...androidDraft,
                      applicationId: event.target.value,
                    });
                  }}
                  onBlur={() => {
                    commitAndroid({
                      ...androidDraft,
                      applicationId: androidDraft.applicationId.trim(),
                    });
                  }}
                />
              </label>
              <InspectorFieldRow>
                <label>
                  Version Name
                  <input
                    value={androidDraft.versionName}
                    disabled={busy}
                    onChange={(event) => {
                      setAndroidDraft({
                        ...androidDraft,
                        versionName: event.target.value,
                      });
                    }}
                    onBlur={() => {
                      commitAndroid({
                        ...androidDraft,
                        versionName: androidDraft.versionName.trim(),
                      });
                    }}
                  />
                </label>
                <label>
                  Version Code
                  <input
                    type="number"
                    min={VERSION_CODE_MIN}
                    step={1}
                    value={androidDraft.versionCode}
                    disabled={busy}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value, 10);
                      setAndroidDraft({
                        ...androidDraft,
                        versionCode: Number.isFinite(next)
                          ? next
                          : androidDraft.versionCode,
                      });
                    }}
                    onBlur={() => {
                      commitAndroid(androidDraft);
                    }}
                  />
                </label>
              </InspectorFieldRow>
              <label>
                Orientation
                <select
                  value={androidDraft.orientation}
                  disabled={busy}
                  onChange={(event) => {
                    const orientation = event.target.value as AndroidOrientation;
                    commitAndroid({ ...androidDraft, orientation });
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label className="inspector-checkbox">
                <input
                  type="checkbox"
                  checked={androidDraft.fullscreen}
                  disabled={busy}
                  onChange={(event) => {
                    commitAndroid({
                      ...androidDraft,
                      fullscreen: event.target.checked,
                    });
                  }}
                />
                Fullscreen
              </label>
              <label className="inspector-checkbox">
                <input
                  type="checkbox"
                  checked={androidDraft.immersiveMode}
                  disabled={busy}
                  onChange={(event) => {
                    commitAndroid({
                      ...androidDraft,
                      immersiveMode: event.target.checked,
                    });
                  }}
                />
                Immersive Mode
              </label>
              <label className="inspector-checkbox">
                <input
                  type="checkbox"
                  checked={androidDraft.keepScreenAwake}
                  disabled={busy}
                  onChange={(event) => {
                    commitAndroid({
                      ...androidDraft,
                      keepScreenAwake: event.target.checked,
                    });
                  }}
                />
                Keep Screen Awake
              </label>

              <p className="panel-hint">Android branding</p>
              <AssetSelectField
                label="App Icon"
                value={androidDraft.iconAssetId}
                kind="texture"
                onCommit={(value) => {
                  commitAndroid({
                    ...androidDraft,
                    iconAssetId: value,
                  });
                }}
              />
              <p className="preferences-section-hint">
                Square PNG, {ANDROID_ICON_RECOMMENDED_SIZE}×{ANDROID_ICON_RECOMMENDED_SIZE} recommended.
              </p>
              <AssetSelectField
                label="Splash Image"
                value={androidDraft.splashAssetId}
                kind="texture"
                onCommit={(value) => {
                  commitAndroid({
                    ...androidDraft,
                    splashAssetId: value,
                  });
                }}
              />
              <p className="preferences-section-hint">
                Square PNG, {ANDROID_SPLASH_RECOMMENDED_SIZE}×{ANDROID_SPLASH_RECOMMENDED_SIZE} recommended.
              </p>

              <p className="panel-hint">Android release signing</p>
              <p className="preferences-section-hint">
                Release / AAB builds need a keystore, key alias, and local
                passwords. Use a Play upload key for shipping, or generate a
                gitignored local key for testing.
              </p>
              <label>
                Keystore path (project-relative)
                <input
                  value={androidDraft.keystorePath ?? ""}
                  disabled={busy}
                  placeholder="signing/release.jks"
                  onChange={(event) => {
                    setAndroidDraft({
                      ...androidDraft,
                      keystorePath: event.target.value,
                    });
                  }}
                  onBlur={() => {
                    const trimmed = (androidDraft.keystorePath ?? "").trim();
                    commitAndroid({
                      ...androidDraft,
                      keystorePath: trimmed.length > 0 ? trimmed : undefined,
                    });
                  }}
                />
              </label>
              <label>
                Key alias
                <input
                  value={androidDraft.keyAlias ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    setAndroidDraft({
                      ...androidDraft,
                      keyAlias: event.target.value,
                    });
                  }}
                  onBlur={() => {
                    const trimmed = (androidDraft.keyAlias ?? "").trim();
                    commitAndroid({
                      ...androidDraft,
                      keyAlias: trimmed.length > 0 ? trimmed : undefined,
                    });
                  }}
                />
              </label>
              {!demo ? (
                <>
                  <p className="preferences-section-hint">
                    Passwords are stored only in gitignored
                    .editor/android-secrets.json on this machine.
                    {secretsConfigured ? " Secrets are configured." : " Secrets not set yet."}
                  </p>
                  <label>
                    Keystore password (local)
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={keystorePasswordDraft}
                      disabled={busy}
                      onChange={(event) => {
                        setKeystorePasswordDraft(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Key password (local)
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={keyPasswordDraft}
                      disabled={busy}
                      onChange={(event) => {
                        setKeyPasswordDraft(event.target.value);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSecretsStatus("Generating local keystore…");
                      void buildClient
                        .generateAndroidKeystore()
                        .then((generated) => {
                          commitAndroid({
                            ...androidDraft,
                            keystorePath: generated.keystorePath,
                            keyAlias: generated.keyAlias,
                          });
                          setSecretsConfigured(true);
                          setSecretsStatus(
                            generated.created
                              ? `Created ${generated.keystorePath} (alias ${generated.keyAlias}). Passwords saved locally.`
                              : `Using existing ${generated.keystorePath}.`,
                          );
                        })
                        .catch((error: unknown) => {
                          setSecretsStatus(
                            error instanceof Error
                              ? error.message
                              : "Failed to generate keystore",
                          );
                        });
                    }}
                  >
                    Generate local upload keystore
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      keystorePasswordDraft.length === 0 ||
                      keyPasswordDraft.length === 0
                    }
                    onClick={() => {
                      setSecretsStatus(null);
                      void buildClient
                        .saveAndroidSecrets({
                          keystorePassword: keystorePasswordDraft,
                          keyPassword: keyPasswordDraft,
                        })
                        .then(() => {
                          setSecretsConfigured(true);
                          setKeystorePasswordDraft("");
                          setKeyPasswordDraft("");
                          setSecretsStatus("Local signing secrets saved.");
                        })
                        .catch((error: unknown) => {
                          setSecretsStatus(
                            error instanceof Error
                              ? error.message
                              : "Failed to save secrets",
                          );
                        });
                    }}
                  >
                    Save local signing secrets
                  </button>
                  {secretsStatus ? (
                    <p className="panel-hint">{secretsStatus}</p>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : status === "loading" ? (
        <p className="panel-empty">Loading project…</p>
      ) : (
        <p className="panel-empty">Project settings unavailable</p>
      )}
      {uniquePanelErrorMessages(projectError, scenesError, saveError).map(
        (message) => (
          <p key={message} className="panel-error">
            {message}
          </p>
        ),
      )}
    </div>
  );
}
