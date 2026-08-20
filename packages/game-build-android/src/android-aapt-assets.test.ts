import { describe, expect, it } from "vitest";
import { withAaptAllowGeneratedAssets } from "./android-aapt-assets.js";

const CAPACITOR_DEFAULT = `        aaptOptions {
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }`;

describe("withAaptAllowGeneratedAssets", () => {
  it("allows .generated before the catch-all .* rule", () => {
    const patched = withAaptAllowGeneratedAssets(CAPACITOR_DEFAULT);
    expect(patched).toContain(
      "ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!.generated:.*:!CVS:!thumbs.db:!picasa.ini:!*~'",
    );
  });

  it("is idempotent", () => {
    const once = withAaptAllowGeneratedAssets(CAPACITOR_DEFAULT);
    expect(withAaptAllowGeneratedAssets(once)).toBe(once);
  });

  it("leaves gradle unchanged when aaptOptions is missing", () => {
    const source = "android { defaultConfig { applicationId 'x' } }";
    expect(withAaptAllowGeneratedAssets(source)).toBe(source);
  });
});
