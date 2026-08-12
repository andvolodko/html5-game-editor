import { describe, expect, it } from "vitest";
import {
  ComponentRegistry,
  applyComponentCatalog,
  buildComponentCatalog,
  defaultPropertiesFromDefinition,
  defineComponent,
  parseComponentCatalogData,
  registerSharedComponents,
} from "./index.js";

describe("ComponentRegistry", () => {
  it("registers, lists, and groups definitions", () => {
    const registry = new ComponentRegistry();
    registerSharedComponents(registry);
    registry.register(
      defineComponent({
        id: "example.Spin",
        displayName: "Spin Controller",
        category: "UI",
        categoryOrder: 20,
        order: 5,
        properties: {
          speed: { kind: "number", default: 1 },
        },
      }),
    );

    expect(registry.has("shared.ChangeScene")).toBe(true);
    expect(registry.has("shared.PerformanceMeter")).toBe(true);
    expect(registry.has("shared.AudioClick")).toBe(true);
    expect(registry.list().map((d) => d.id)).toEqual([
      "shared.ChangeScene",
      "shared.AudioClick",
      "example.Spin",
      "shared.PerformanceMeter",
    ]);
    expect(registry.listMenuGroups().map((g) => g.category)).toEqual([
      "Scene",
      "Audio",
      "UI",
      "Debug",
    ]);
  });

  it("throws on duplicate id", () => {
    const registry = new ComponentRegistry();
    registerSharedComponents(registry);
    expect(() => registerSharedComponents(registry)).toThrow(/duplicate/);
  });

  it("builds default properties from definition", () => {
    const def = defineComponent({
      id: "t.Demo",
      displayName: "Demo",
      category: "Test",
      categoryOrder: 0,
      order: 0,
      properties: {
        n: { kind: "number", default: 3 },
        s: { kind: "string", default: "hi" },
        b: { kind: "boolean", default: true },
        e: { kind: "enum", default: "a", options: ["a", "b"] },
        d: { kind: "dynamicEnum", default: "main", source: "scenes" },
        a: { kind: "asset", assetType: "audio", default: "" },
      },
    });
    expect(defaultPropertiesFromDefinition(def)).toEqual({
      n: 3,
      s: "hi",
      b: true,
      e: "a",
      d: "main",
      a: "",
    });
  });

  it("round-trips a serializable catalog", () => {
    const catalog = buildComponentCatalog((registry) => {
      registerSharedComponents(registry);
    }, [{ id: "game.start", label: "Start" }]);
    const parsed = parseComponentCatalogData(
      JSON.parse(JSON.stringify(catalog)) as unknown,
    );
    const registry = new ComponentRegistry();
    applyComponentCatalog(registry, parsed);
    expect(registry.has("shared.ChangeScene")).toBe(true);
    expect(registry.has("shared.PerformanceMeter")).toBe(true);
    expect(registry.has("shared.AudioClick")).toBe(true);
    expect(parsed.busEvents).toEqual([{ id: "game.start", label: "Start" }]);
  });
});
