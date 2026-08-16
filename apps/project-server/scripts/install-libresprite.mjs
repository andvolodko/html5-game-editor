import { spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import {
  access,
  chmod,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const LIBRESPRITE_RELEASE_TAG = "v1.1";
const LIBRESPRITE_REPO = "LibreSprite/LibreSprite";
const VENDOR_DIR_NAME = "vendor/libresprite";
const CLI_PATH_FILE = "cli-path";
const STAMP_FILE = "install-stamp";
const MAX_CLI_SEARCH_DEPTH = 8;
const UNIX_EXECUTABLE_MODE = 0o755;
const DOWNLOAD_USER_AGENT = "html5-game-editor-libresprite-install";

const CLI_BASENAMES = new Set([
  "libresprite.exe",
  "LibreSprite.exe",
  "libresprite",
]);

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const vendorDir = path.join(packageRoot, ...VENDOR_DIR_NAME.split("/"));
const optional = process.argv.includes("--optional");

function platformAsset() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32" && arch === "x64") {
    return {
      key: "windows-x86_64",
      fileName: "libresprite-development-windows-x86_64.zip",
    };
  }
  if (platform === "linux" && arch === "x64") {
    return {
      key: "linux-x86_64",
      fileName: "libresprite-development-linux-x86_64.zip",
    };
  }
  if (platform === "darwin" && arch === "arm64") {
    return {
      key: "macos-arm64",
      fileName: "libresprite-development-macos-arm64.zip",
    };
  }
  return undefined;
}

function log(message) {
  console.log(`[libresprite] ${message}`);
}

function warn(message) {
  console.warn(`[libresprite] ${message}`);
}

function shouldSkipOptionalInstall() {
  return process.env.CI === "true" || process.env.SKIP_LIBRESPRITE_INSTALL === "1";
}

async function alreadyInstalled(stampValue) {
  try {
    const stamp = (await readFile(path.join(vendorDir, STAMP_FILE), "utf8")).trim();
    const cliRelative = (await readFile(path.join(vendorDir, CLI_PATH_FILE), "utf8")).trim();
    if (stamp !== stampValue || cliRelative.length === 0) {
      return false;
    }
    const cliPath = path.resolve(vendorDir, cliRelative);
    const insideVendor =
      cliPath === vendorDir || cliPath.startsWith(vendorDir + path.sep);
    if (!insideVendor) {
      return false;
    }
    await access(cliPath);
    return true;
  } catch {
    return false;
  }
}

async function findCli(dir, depth = 0) {
  if (depth > MAX_CLI_SEARCH_DEPTH) {
    return undefined;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && CLI_BASENAMES.has(entry.name)) {
      return path.join(dir, entry.name);
    }
  }
  const macCli = path.join(dir, "LibreSprite.app", "Contents", "MacOS", "libresprite");
  try {
    await access(macCli);
    return macCli;
  } catch {
    // Not a macOS app bundle at this level.
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const found = await findCli(path.join(dir, entry.name), depth + 1);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function extractZip(zipPath, destDir) {
  const tar = spawnSync("tar", ["-xf", zipPath, "-C", destDir], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (tar.status === 0) {
    return;
  }
  if (process.platform === "win32") {
    const expanded = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(destDir)} -Force`,
      ],
      { stdio: "inherit", windowsHide: true },
    );
    if (expanded.status === 0) {
      return;
    }
  }
  throw new Error("Failed to extract the LibreSprite archive (tar / Expand-Archive).");
}

async function download(url, destFile) {
  const response = await fetch(url, {
    headers: { "User-Agent": DOWNLOAD_USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Download returned an empty body");
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destFile));
}

async function install() {
  if (optional && shouldSkipOptionalInstall()) {
    log("Skipping packaged LibreSprite (CI or SKIP_LIBRESPRITE_INSTALL).");
    return;
  }

  const asset = platformAsset();
  if (!asset) {
    const message = `No packaged LibreSprite build for ${process.platform}/${process.arch}. Install Aseprite or LibreSprite yourself and set ASEPRITE or PATH.`;
    if (optional) {
      warn(message);
      return;
    }
    throw new Error(message);
  }

  const stampValue = `${LIBRESPRITE_RELEASE_TAG}\n${asset.key}`;
  if (await alreadyInstalled(stampValue)) {
    log(`LibreSprite ${LIBRESPRITE_RELEASE_TAG} already present.`);
    return;
  }

  const url = `https://github.com/${LIBRESPRITE_REPO}/releases/download/${LIBRESPRITE_RELEASE_TAG}/${asset.fileName}`;
  const workDir = path.join(
    tmpdir(),
    `libresprite-install-${process.pid}-${Date.now()}`,
  );
  await mkdir(workDir, { recursive: true });
  const zipPath = path.join(workDir, asset.fileName);
  const extractDir = path.join(workDir, "extract");
  await mkdir(extractDir, { recursive: true });

  try {
    log(`Downloading LibreSprite ${LIBRESPRITE_RELEASE_TAG} (${asset.key})…`);
    await download(url, zipPath);
    log("Extracting…");
    extractZip(zipPath, extractDir);
    const cliPath = await findCli(extractDir);
    if (!cliPath) {
      throw new Error("Extracted archive did not contain a libresprite executable.");
    }
    if (process.platform !== "win32") {
      await chmod(cliPath, UNIX_EXECUTABLE_MODE);
    }
    await rm(vendorDir, { recursive: true, force: true });
    await mkdir(path.dirname(vendorDir), { recursive: true });
    try {
      await rename(extractDir, vendorDir);
    } catch {
      await cp(extractDir, vendorDir, { recursive: true });
      await rm(extractDir, { recursive: true, force: true });
    }
    const relocatedCli = path.join(vendorDir, path.relative(extractDir, cliPath));
    await writeFile(path.join(vendorDir, CLI_PATH_FILE), `${path.relative(vendorDir, relocatedCli)}\n`);
    await writeFile(path.join(vendorDir, STAMP_FILE), `${stampValue}\n`);
    log(`Installed ${path.relative(packageRoot, relocatedCli)}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

try {
  await install();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (optional) {
    warn(`Could not install LibreSprite (${message}). Aseprite compile will stay unavailable until you run \`pnpm install-libresprite\`.`);
    process.exit(0);
  }
  console.error(`[libresprite] ${message}`);
  process.exit(1);
}
