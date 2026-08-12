import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { ComponentCatalogService } from "./component-catalog-service.js";

describe("ComponentCatalogService", () => {
  let root = "";

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("returns empty catalog when components entry is missing", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "comp-catalog-"));
    const service = new ComponentCatalogService(new ProjectService(root));
    await expect(service.getCatalog()).resolves.toEqual({
      components: [],
      busEvents: [],
    });
  });

  it("loads catalog from src/components/index.ts via getComponentCatalog", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "comp-catalog-"));
    await mkdir(path.join(root, "src", "components"), { recursive: true });
    await writeFile(
      path.join(root, "src", "components", "index.ts"),
      `
export function getComponentCatalog() {
  return {
    components: [{
      id: "demo.Marker",
      displayName: "Marker",
      category: "Test",
      categoryOrder: 1,
      order: 1,
      properties: {
        label: { kind: "string", default: "hi" },
      },
    }],
    busEvents: [{ id: "demo.ping", label: "Ping" }],
  };
}
`,
      "utf8",
    );

    const service = new ComponentCatalogService(new ProjectService(root));
    const catalog = await service.getCatalog();
    expect(catalog.components).toHaveLength(1);
    expect(catalog.components[0]?.id).toBe("demo.Marker");
    expect(catalog.busEvents).toEqual([{ id: "demo.ping", label: "Ping" }]);
  });
});
