# Android export

Package a game as a **debug APK**, **release APK**, or **release AAB** (Play App Bundle). The web production Vite build is the only game bundler; Android wraps that `dist/` in a Capacitor shell and runs Gradle.

**Status:** shipped. Needs the live editor (`pnpm dev`) and a local Android toolchain. Not available in the GitHub Pages / `pnpm dev:demo` snapshot.

Orientation: [`PROJECT.md`](../PROJECT.md). Runtime / Vite builds: [`runtime.md`](./runtime.md). Scene scale (`scaleMode` + design resolution) uses the same `GameScreenHost` path as the web build; portrait WebView layout is covered there.

---

## Requirements

Install these on the **operator machine** that runs project-server. CI unit tests mock process execution and do **not** need Android Studio.

| Requirement | Notes |
| --- | --- |
| **Node.js** ≥ 20 and **pnpm** | Same as the rest of the repo. |
| **Live editor** | `pnpm dev` (editor + project-server). Android is disabled in demo mode. |
| **JDK 21+** | Android Gradle Plugin. The packager finds a qualifying JDK (including under `Program Files\Java`, Adoptium, Corretto, Android Studio JBR) and sets `JAVA_HOME` for Gradle. A stale `JAVA_HOME` (for example JDK 17) with a newer `java` on PATH otherwise fails with `invalid source release: 21`. |
| **Android SDK** | Platform **`android-36`**. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, or use the default install (`%LOCALAPPDATA%\Android\Sdk` on Windows, `~/Library/Android/sdk` on macOS, `~/Android/Sdk` on Linux). |
| **Release / AAB only** | Keystore under the project root + passwords in gitignored `.editor/android-secrets.json`. |

Android Studio is the usual way to get the SDK; this repo does **not** install it. After Studio (or cmdline-tools) is present, install API 36 if the build reports `ANDROID_PLATFORM_MISSING`:

```bash
sdkmanager "platforms;android-36"
```

Capacitor CLI is a pnpm dependency of `@game-editor/game-build-android`. At pack time it is installed into `games/<id>/.build/android/` with `pnpm install --ignore-workspace` and invoked as `node node_modules/@capacitor/cli/bin/capacitor`.

Toolchain constants (not stored in `project.json`):

| Constant | Value |
| --- | --- |
| `compileSdk` / `targetSdk` | **36** |
| `minSdk` | 23 (Capacitor 7) |
| Capacitor | `7.4.3` |
| JDK | **21** |

---

## How to use (editor)

1. `pnpm dev` and open the game project.
2. **Project Settings** (dock panel) → **Android**: set App Name, Application ID (reverse-DNS, e.g. `com.gameeditor.my_game`), Version Name / Version Code, orientation, fullscreen / immersive / keep-awake.
3. Optional **Android branding**: pick texture assets for App Icon and Splash Image.
4. **File → Build Game…**

### Debug APK (sideload / device testing)

1. Platform **Android**
2. Build type **Debug**, Output **APK**
3. **Build**

No keystore is required. Gradle uses the debug keystore (`ANDROID_DEBUG_UNSIGNED` is a warning, not a failure).

### Release AAB (Google Play)

1. Project Settings → **Android release signing**:
   - **Generate local upload keystore** (creates gitignored `.editor/upload.p12`, alias `upload`, and writes passwords to `.editor/android-secrets.json`), **or**
   - Set a project-relative keystore path / alias (your Play upload key) and **Save local signing secrets**.
2. **File → Build Game…** → Android → **Release** → **AAB** → **Build**.

Release APK is the same flow with Output **APK**. AAB is disabled for Debug (`ANDROID_FORMAT_UNSUPPORTED`).

### After a successful build

The dialog shows the artifact path (copy button) and a build log. Use **Open output folder** or **Open build log**.

| Output | Typical location |
| --- | --- |
| Debug APK | `games/<id>/.build/android/android/app/build/outputs/apk/debug/` |
| Release APK | `games/<id>/.build/android/android/app/build/outputs/apk/release/` |
| Release AAB | `games/<id>/.build/android/android/app/build/outputs/bundle/release/` |
| Full log | `games/<id>/.build/android/build.log` (passwords are never written) |

`.build/` and `.editor/` are gitignored.

Aseprite **AnimatedSprite** sheets are stored on disk under `.generated/`. Android WebView (and aapt) skip hidden paths, so the game Vite build publishes them as `_generated/` and the static resolver requests `/_generated/...`. Rebuild the APK after this change.

---

## How to use (CLI)

From the repo root. The game must already have a valid `project.json` (and, for release, a keystore + `.editor/android-secrets.json`).

```bash
# Debug APK
pnpm --filter @game-editor/game-build-android build:debug -- games/editor-features-demo

# Release AAB (Play)
pnpm --filter @game-editor/game-build-android build:android -- games/editor-features-demo --format aab

# Release APK
pnpm --filter @game-editor/game-build-android build:android -- games/editor-features-demo --format apk --release
```

| `buildType` | `format` | Gradle task |
| --- | --- | --- |
| debug | apk | `assembleDebug` |
| release | apk | `assembleRelease` |
| release | aab | `bundleRelease` |

---

## Project settings (`project.json`)

Optional additive `android` block (schema v1). Missing fields use defaults from the display name / project folder.

| Field | Purpose |
| --- | --- |
| `appName` | Launcher label |
| `applicationId` | Reverse-DNS package id |
| `versionName` / `versionCode` | Play versioning (`versionCode` ≥ 1) |
| `orientation` | `auto` \| `portrait` \| `landscape` |
| `fullscreen` / `immersiveMode` / `keepScreenAwake` | Window flags |
| `keystorePath` / `keyAlias` | Non-secret; project-relative keystore |
| `iconAssetId` / `splashAssetId` | Optional catalogue texture ids |

Example:

```json
"android": {
  "appName": "Editor Features Demo",
  "applicationId": "com.gameeditor.editor_features_demo",
  "versionName": "1.0.0",
  "versionCode": 1,
  "orientation": "auto",
  "fullscreen": true,
  "immersiveMode": true,
  "keepScreenAwake": false,
  "keystorePath": ".editor/upload.p12",
  "keyAlias": "upload"
}
```

### Signing secrets (never in `project.json`)

```text
games/<id>/.editor/android-secrets.json
```

```json
{
  "keystorePassword": "…",
  "keyPassword": "…"
}
```

* **Generate local upload keystore** writes this file for you.
* **Save local signing secrets** updates passwords only (does not return them later).
* Never commit this file. Never log passwords. `GET /project` does not include them.
* Status only: `GET /project/android-secrets` → `{ configured: boolean }`.
* Generate: `POST /project/android-keystore`.

When `iconAssetId` / `splashAssetId` point at textures, the packager generates mipmap / drawable resources **after** Capacitor sync. Use a **square PNG**: **1024×1024** for the app icon (downscaled into mipmaps) and **512×512** for the splash. Missing assets produce warnings (`ANDROID_ICON_MISSING` / `ANDROID_SPLASH_MISSING`) and Capacitor defaults are kept.

---

## Architecture

```text
game project (games/<id>/)
        │
        ▼
Web production build  (existing Vite via @game-editor/project/vite)
        │
        ▼
games/<id>/dist/
        │
        ▼
@game-editor/game-build-android
  · generate games/<id>/.build/android/
  · copy dist → www/
  · Capacitor sync
  · optional icon/splash generation
  · optional release signing (keystore.properties in .build/)
  · Gradle assembleDebug | assembleRelease | bundleRelease
        │
        ▼
Debug APK / Release APK / Release AAB
```

| Package | Role |
| --- | --- |
| `@game-editor/game-build` | `BuildTarget`, `BuildService`, `ProcessRunner`, `WebBuildTarget`, `buildType` |
| `@game-editor/game-build-android` | Capacitor packaging, signing, branding, Gradle |
| `apps/project-server` | `POST /build`, `POST /build/reveal`, `GET\|PUT /project/android-secrets`, `POST /project/android-keystore` |
| `apps/editor` | **File → Build Game…** + Project Settings Android section |

**Do not** duplicate Pixi/Three bundling for Android. Do not import Capacitor or Gradle packages from gameplay code or the Vite-bundled editor.

HTTP body example:

```text
POST /build
{ "platform": "android", "mode": "production", "format": "aab", "buildType": "release" }
```

Standalone games call `bindDocumentVisibilityPause` so `visibilitychange` pauses `GameRuntime` and `HtmlAudioPlayer`. No Capacitor import in gameplay.

---

## Error codes

| Code | Meaning |
| --- | --- |
| `INVALID_APPLICATION_ID` | Bad reverse-DNS package id |
| `INVALID_APP_NAME` / `INVALID_VERSION_NAME` / `INVALID_VERSION_CODE` | Settings validation |
| `JDK_NOT_FOUND` | Missing or too-old Java |
| `ANDROID_SDK_NOT_FOUND` | SDK root missing |
| `ANDROID_PLATFORM_MISSING` | `platforms/android-36` not installed |
| `WEB_BUILD_FAILED` | Vite production build failed |
| `WEB_PACKAGE_JSON_MISSING` | Game `package.json` missing |
| `OUTPUT_DIR_NOT_WRITABLE` | Cannot write `.build/` or `dist/` |
| `CAPACITOR_SYNC_FAILED` | install / `cap add` / `cap sync` failed |
| `GRADLE_BUILD_FAILED` | Gradle task failed or artifact missing |
| `KEYSTORE_NOT_FOUND` | Release keystore path missing or file not found |
| `KEY_ALIAS_MISSING` | Release key alias not set |
| `SIGNING_SECRETS_MISSING` | `.editor/android-secrets.json` missing/incomplete |
| `SIGNING_FAILED` | Signing config / signed Gradle failure |
| `ANDROID_FORMAT_UNSUPPORTED` | AAB requested with debug buildType |
| `ANDROID_DEBUG_UNSIGNED` | Warning: debug APK uses the debug keystore |
| `ANDROID_ICON_MISSING` / `ANDROID_SPLASH_MISSING` | Warning: branding asset missing |
| `BUILD_IN_PROGRESS` | Another build is already running |
| `UNKNOWN_BUILD_PLATFORM` | Not `web` or `android` |

---

## Out of scope

Google Play Console upload, AdMob, billing, Play Games, PAD, Firebase, iOS, cloud builds, opt-in real-SDK integration tests.
