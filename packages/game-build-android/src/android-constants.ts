/**
 * Centralized Android toolchain defaults for Google Play (August 2026).
 * Do not scatter these literals across generators or templates.
 */

/** Google Play requires target API 36 for new apps/updates from 31 Aug 2026. */
export const ANDROID_COMPILE_SDK = 36;
export const ANDROID_TARGET_SDK = 36;

/** Capacitor 7 minimum supported SDK. */
export const ANDROID_MIN_SDK = 23;

/** Android Gradle Plugin expects JDK 21. */
export const ANDROID_REQUIRED_JDK_MAJOR = 21;

/** Pinned Capacitor line for generated projects (must match package.json deps). */
export const CAPACITOR_VERSION = "7.4.3";

export const ANDROID_WEB_DIR = "www";
export const ANDROID_BUILD_SUBDIR = "android";
export const ANDROID_LOG_FILE_NAME = "build.log";

export const ANDROID_BUILD_TARGET_ID = "android";

/** Gitignored local upload keystore created by Project Settings. */
export const ANDROID_LOCAL_KEYSTORE_RELATIVE = ".editor/upload.p12";
export const ANDROID_LOCAL_KEY_ALIAS = "upload";
