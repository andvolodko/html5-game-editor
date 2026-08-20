import { describe, expect, it } from "vitest";
import { patchAppBuildGradleForReleaseSigning } from "./android-signing-config.js";

const CAPACITOR_APP_BUILD_GRADLE = `apply plugin: 'com.android.application'

android {
    namespace "com.gameeditor.editor_features_demo"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.gameeditor.editor_features_demo"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
`;

describe("patchAppBuildGradleForReleaseSigning", () => {
  it("wires signingConfig onto buildTypes.release, not signingConfigs.release", () => {
    const patched = patchAppBuildGradleForReleaseSigning(CAPACITOR_APP_BUILD_GRADLE);
    expect(patched).toMatch(
      /signingConfigs\s*\{\s*release\s*\{[^}]*keystoreProperties/,
    );
    expect(patched).toMatch(
      /buildTypes\s*\{\s*release\s*\{\s*signingConfig signingConfigs\.release/,
    );
    expect(patched).not.toMatch(
      /signingConfigs\s*\{\s*release\s*\{\s*signingConfig signingConfigs\.release/,
    );
  });

  it("is idempotent", () => {
    const once = patchAppBuildGradleForReleaseSigning(CAPACITOR_APP_BUILD_GRADLE);
    const twice = patchAppBuildGradleForReleaseSigning(once);
    expect(twice).toBe(once);
  });

  it("heals a nested signingConfig left by the previous patch", () => {
    const broken = `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

apply plugin: 'com.android.application'

android {
    signingConfigs {
        release {
            signingConfig signingConfigs.release
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                storeFile file(keystoreProperties['storeFile'])
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}
`;
    const healed = patchAppBuildGradleForReleaseSigning(broken);
    expect(healed).not.toMatch(
      /signingConfigs\s*\{\s*release\s*\{\s*signingConfig signingConfigs\.release/,
    );
    expect(healed).toMatch(
      /buildTypes\s*\{\s*release\s*\{\s*signingConfig signingConfigs\.release/,
    );
  });
});
