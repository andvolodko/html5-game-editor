import type { ComponentRegistry } from "@game-editor/game-components";

type GameComponentsModule = {
  installGameRuntime?: (registry: ComponentRegistry) => void;
  installExampleGameRuntime?: (registry: ComponentRegistry) => void;
};

/**
 * Vite discovers each game's components barrel. No hardcoded project-id map.
 * Games may export `installGameRuntime(registry)` to re-attach `create` factories
 * after a metadata-only catalog load (editor / preview).
 */
const gameComponentModules = import.meta.glob<GameComponentsModule>(
  "../../../../games/*/src/components/index.ts",
);

function modulePathForProject(projectId: string): string | undefined {
  const needle = `/games/${projectId}/src/components/index.ts`;
  return Object.keys(gameComponentModules).find((path) =>
    path.replaceAll("\\", "/").endsWith(needle),
  );
}

/** Re-attach the active game's script `create` factories onto the session registry. */
export async function installActiveGameRuntime(
  projectId: string | null | undefined,
  registry: ComponentRegistry,
): Promise<void> {
  if (!projectId) {
    return;
  }
  const modulePath = modulePathForProject(projectId);
  if (!modulePath) {
    return;
  }
  const loader = gameComponentModules[modulePath];
  if (!loader) {
    return;
  }
  const mod = await loader();
  const install = mod.installGameRuntime ?? mod.installExampleGameRuntime;
  install?.(registry);
}
