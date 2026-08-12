import type { ComponentCatalogData } from "@game-editor/game-components";
import { parseComponentCatalogData } from "@game-editor/game-components";

export interface ComponentCatalogApiClient {
  getCatalog(): Promise<ComponentCatalogData>;
}

export function createFetchComponentCatalogApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ComponentCatalogApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async getCatalog() {
      const response = await fetchImpl(`${root}/components/catalog`);
      const payload = (await response.json()) as {
        ok: boolean;
        catalog?: unknown;
        message?: string;
      };
      if (!response.ok || !payload.ok || payload.catalog === undefined) {
        throw new Error(
          payload.message ??
            `Load component catalog failed (${String(response.status)})`,
        );
      }
      return parseComponentCatalogData(payload.catalog);
    },
  };
}
