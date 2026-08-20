import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { parseAssetDatabase } from "@game-editor/assets";
import {
  ANDROID_SPLASH_RECOMMENDED_SIZE,
  type AndroidBuildSettings,
} from "@game-editor/project";
import type { BuildIssue } from "@game-editor/game-build";

const ASSET_DB_RELATIVE = path.join(".project", "assets.json");

/** Android launcher icon sizes (px) per density folder. */
const LAUNCHER_SIZES: ReadonlyArray<{ folder: string; size: number }> = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

const ADAPTIVE_FOREGROUND_SIZES: ReadonlyArray<{ folder: string; size: number }> =
  [
    { folder: "mipmap-mdpi", size: 108 },
    { folder: "mipmap-hdpi", size: 162 },
    { folder: "mipmap-xhdpi", size: 216 },
    { folder: "mipmap-xxhdpi", size: 324 },
    { folder: "mipmap-xxxhdpi", size: 432 },
  ];

const SPLASH_SIZE = ANDROID_SPLASH_RECOMMENDED_SIZE;

export interface AndroidBrandingResult {
  issues: BuildIssue[];
}

async function resolveTexturePath(
  projectRoot: string,
  assetId: string,
): Promise<string | undefined> {
  const dbPath = path.join(projectRoot, ASSET_DB_RELATIVE);
  let raw: string;
  try {
    raw = await readFile(dbPath, "utf8");
  } catch {
    return undefined;
  }
  const db = parseAssetDatabase(JSON.parse(raw) as unknown);
  const record = db.assets.find((asset) => asset.id === assetId);
  if (!record || record.type !== "texture") {
    return undefined;
  }
  return path.resolve(projectRoot, record.path);
}

async function writePngResize(
  sourcePath: string,
  destPath: string,
  size: number,
): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });
  await sharp(sourcePath)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(destPath);
}

/**
 * Generates launcher icons and splash drawable from project asset ids.
 * Applied after Capacitor sync so custom res/ is not wiped.
 */
export async function applyAndroidBranding(args: {
  projectRoot: string;
  androidProjectDir: string;
  settings: AndroidBuildSettings;
}): Promise<AndroidBrandingResult> {
  const issues: BuildIssue[] = [];
  const resRoot = path.join(args.androidProjectDir, "app", "src", "main", "res");

  if (args.settings.iconAssetId) {
    const source = await resolveTexturePath(
      args.projectRoot,
      args.settings.iconAssetId,
    );
    if (!source) {
      issues.push({
        severity: "warning",
        code: "ANDROID_ICON_MISSING",
        message: `Icon asset "${args.settings.iconAssetId}" was not found or is not a texture.`,
      });
    } else {
      try {
        for (const entry of LAUNCHER_SIZES) {
          await writePngResize(
            source,
            path.join(resRoot, entry.folder, "ic_launcher.png"),
            entry.size,
          );
          await writePngResize(
            source,
            path.join(resRoot, entry.folder, "ic_launcher_round.png"),
            entry.size,
          );
        }
        for (const entry of ADAPTIVE_FOREGROUND_SIZES) {
          await writePngResize(
            source,
            path.join(resRoot, entry.folder, "ic_launcher_foreground.png"),
            entry.size,
          );
        }
      } catch (error) {
        issues.push({
          severity: "warning",
          code: "ANDROID_ICON_MISSING",
          message: `Failed to generate launcher icons: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  }

  if (args.settings.splashAssetId) {
    const source = await resolveTexturePath(
      args.projectRoot,
      args.settings.splashAssetId,
    );
    if (!source) {
      issues.push({
        severity: "warning",
        code: "ANDROID_SPLASH_MISSING",
        message: `Splash asset "${args.settings.splashAssetId}" was not found or is not a texture.`,
      });
    } else {
      try {
        const drawableDir = path.join(resRoot, "drawable");
        await writePngResize(
          source,
          path.join(drawableDir, "splash.png"),
          SPLASH_SIZE,
        );
        await writeFile(
          path.join(drawableDir, "splash_background.xml"),
          `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/black"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash"/>
    </item>
</layer-list>
`,
          "utf8",
        );
      } catch (error) {
        issues.push({
          severity: "warning",
          code: "ANDROID_SPLASH_MISSING",
          message: `Failed to generate splash: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  }

  return { issues };
}
