/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "scene-no-editor-runtime-or-renderers",
      comment:
        "packages/scene is domain data. It must not depend on editor, runtime, or Pixi/Three.",
      severity: "error",
      from: { path: "^packages/scene" },
      to: {
        path: "(packages/(editor-core|runtime|renderer-pixi|renderer-three)|apps/|games/|(^|/)(pixi\\.js|three)(/|$))",
      },
    },
    {
      name: "runtime-no-editor",
      comment: "packages/runtime must not depend on editor-core or editor UI.",
      severity: "error",
      from: { path: "^packages/runtime" },
      to: { path: "(packages/editor-core|apps/editor)" },
    },
    {
      name: "game-components-no-editor-or-renderers",
      comment:
        "Shared gameplay components must stay runtime-safe: no editor UI or renderer packages.",
      severity: "error",
      from: { path: "^packages/game-components" },
      to: {
        path: "(packages/(editor-core|renderer-pixi|renderer-three)|apps/|(^|/)(pixi\\.js|three)(/|$))",
      },
    },
    {
      name: "pixi-three-isolation",
      comment: "Renderer packages must not import each other.",
      severity: "error",
      from: { path: "^packages/renderer-pixi" },
      to: { path: "^packages/renderer-three" },
    },
    {
      name: "three-pixi-isolation",
      comment: "Renderer packages must not import each other.",
      severity: "error",
      from: { path: "^packages/renderer-three" },
      to: { path: "^packages/renderer-pixi" },
    },
    {
      name: "games-no-editor-internals",
      comment: "Standalone games must not import editor-core or apps/editor.",
      severity: "error",
      from: { path: "^games/" },
      to: { path: "(packages/editor-core|apps/editor)" },
    },
    {
      name: "games-no-game-build",
      comment:
        "Games must not import Node-only build packages (Capacitor/Gradle).",
      severity: "error",
      from: { path: "^games/" },
      to: { path: "packages/game-build" },
    },
    {
      name: "editor-no-game-build",
      comment:
        "Browser editor must not import Node-only build packages; use project-server HTTP.",
      severity: "error",
      from: { path: "^apps/editor" },
      to: { path: "packages/game-build" },
    },
    {
      name: "runtime-no-game-build",
      comment: "Runtime must not depend on native packaging packages.",
      severity: "error",
      from: { path: "^packages/runtime" },
      to: { path: "packages/game-build" },
    },
  ],
  options: {
    doNotFollow: {
      path: "(node_modules|dist)",
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
