import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  buildComponentCatalog,
  parseComponentCatalogData,
  type ComponentCatalogData,
  type ComponentRegistry,
  type BusEventDefinition,
} from "@game-editor/game-components";
import type { ProjectService } from "./project-service.js";

/** Convention path inside each game project (project-relative). */
export const GAME_COMPONENTS_ENTRY = "src/components/index.ts";

type GameComponentsModule = {
  getComponentCatalog?: () => ComponentCatalogData;
  registerGameComponents?: (registry: ComponentRegistry) => void;
  listBusEvents?: () => readonly BusEventDefinition[];
};

/**
 * Loads the active project's script-component catalog by dynamically importing
 * `src/components/index.ts` under the project root (no hardcoded game id map).
 */
export class ComponentCatalogService {
  constructor(private readonly projectService: ProjectService) {}

  async getCatalog(): Promise<ComponentCatalogData> {
    const entryPath = this.projectService.resolveProjectPath(
      GAME_COMPONENTS_ENTRY,
    );
    if (!(await fileExists(entryPath))) {
      return { components: [], busEvents: [] };
    }

    const mod = (await import(
      `${pathToFileURL(entryPath).href}?t=${String(Date.now())}`
    )) as GameComponentsModule;

    if (typeof mod.getComponentCatalog === "function") {
      return parseComponentCatalogData(mod.getComponentCatalog());
    }

    if (typeof mod.registerGameComponents === "function") {
      const busEvents =
        typeof mod.listBusEvents === "function" ? mod.listBusEvents() : [];
      return parseComponentCatalogData(
        buildComponentCatalog(mod.registerGameComponents, busEvents),
      );
    }

    return { components: [], busEvents: [] };
  }
}

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}
