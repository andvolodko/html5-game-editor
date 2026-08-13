import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GAMES_SEGMENT = "games";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = path.join(repoRoot, "games");
const editorDist = path.join(repoRoot, "apps", "editor", "dist");

function normalizePagesBase(baseUrl) {
  if (baseUrl === "" || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function gameBaseUrl(pagesBase, gameId) {
  return `${pagesBase}${GAMES_SEGMENT}/${gameId}/`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rendererLabel(renderers) {
  const hasPixi = renderers.includes("pixi");
  const hasThree = renderers.includes("three");
  if (hasPixi && hasThree) {
    return "Pixi + Three";
  }
  if (hasThree) {
    return "Three.js";
  }
  return "PixiJS";
}

function listGames() {
  if (!existsSync(gamesRoot)) {
    return [];
  }
  return readdirSync(gamesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const projectPath = path.join(gamesRoot, entry.name, "project.json");
      const packagePath = path.join(gamesRoot, entry.name, "package.json");
      if (!existsSync(projectPath) || !existsSync(packagePath)) {
        return undefined;
      }
      const project = JSON.parse(readFileSync(projectPath, "utf8"));
      const displayName =
        typeof project.displayName === "string" && project.displayName.length > 0
          ? project.displayName
          : entry.name;
      const renderers = Array.isArray(project.renderers) ? project.renderers : [];
      return {
        id: entry.name,
        displayName,
        renderers: renderers.filter((kind) => typeof kind === "string"),
      };
    })
    .filter((game) => game !== undefined)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function renderGamesIndexHtml(pagesBase, games) {
  const cards = games
    .map((game) => {
      const href = `${game.id}/`;
      return `<a class="card" href="${escapeHtml(href)}">
        <strong>${escapeHtml(game.displayName)}</strong>
        <span class="id">${escapeHtml(game.id)}</span>
        <span class="tag">${escapeHtml(rendererLabel(game.renderers))}</span>
      </a>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demo games — HTML5 Game Editor</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: #14161c;
      color: #e8ecf4;
    }
    main { max-width: 720px; margin: 0 auto; padding: 48px 24px 64px; }
    h1 { font-size: 1.6rem; font-weight: 600; margin: 0 0 8px; }
    p { color: #9aa3b5; line-height: 1.5; }
    .back { color: #5b8cff; text-decoration: none; }
    .back:hover { text-decoration: underline; }
    .grid {
      display: grid;
      gap: 12px;
      margin-top: 28px;
    }
    .card {
      display: grid;
      gap: 4px;
      padding: 16px 18px;
      border: 1px solid #2a3140;
      border-radius: 10px;
      background: #171a22;
      color: inherit;
      text-decoration: none;
    }
    .card:hover { border-color: #5b8cff; }
    .id { color: #9aa3b5; font-size: 0.85rem; }
    .tag {
      justify-self: start;
      margin-top: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #1b1f29;
      color: #9aa3b5;
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <main>
    <p><a class="back" href="${escapeHtml(pagesBase)}">← Editor demo</a></p>
    <h1>Demo games</h1>
    <p>Standalone Vite builds of every <code>games/*</code> package. The editor itself stays at the site root.</p>
    <div class="grid">
${cards}
    </div>
  </main>
</body>
</html>
`;
}

function runGameBuild(gameId, viteBase) {
  const result = spawnSync(
    "pnpm",
    ["--filter", `@games/${gameId}`, "build"],
    {
      cwd: repoRoot,
      env: { ...process.env, VITE_BASE: viteBase },
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    throw new Error(`Game build failed: ${gameId}`);
  }
}

function main() {
  if (!existsSync(path.join(editorDist, "index.html"))) {
    throw new Error(
      "apps/editor/dist/index.html is missing. Run `pnpm build:demo` first.",
    );
  }

  const pagesBase = normalizePagesBase(process.env.VITE_BASE ?? "/");
  const games = listGames();
  if (games.length === 0) {
    throw new Error(`No games with project.json found under ${gamesRoot}`);
  }

  const gamesOut = path.join(editorDist, GAMES_SEGMENT);
  mkdirSync(gamesOut, { recursive: true });

  for (const game of games) {
    const viteBase = gameBaseUrl(pagesBase, game.id);
    console.log(`Building ${game.id} with VITE_BASE=${viteBase}`);
    runGameBuild(game.id, viteBase);
    const source = path.join(gamesRoot, game.id, "dist");
    if (!existsSync(path.join(source, "index.html"))) {
      throw new Error(`Expected ${source}/index.html after build`);
    }
    const dest = path.join(gamesOut, game.id);
    mkdirSync(dest, { recursive: true });
    cpSync(source, dest, { recursive: true });
  }

  writeFileSync(
    path.join(gamesOut, "index.html"),
    renderGamesIndexHtml(pagesBase, games),
  );
  console.log(`Copied ${games.length} game(s) to ${path.relative(repoRoot, gamesOut)}`);
}

main();
