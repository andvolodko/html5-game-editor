import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  findScript,
  getScriptComponents,
} from "@game-editor/scene";
import {
  defineComponent,
  registerSharedComponents,
} from "@game-editor/game-components";
import { Editor } from "./editor.js";

const SHARED_METER = "shared.PerformanceMeter";

describe("script component commands", () => {
  function editorWithCatalog(): Editor {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.replaceComponentCatalog((registry) => {
      registerSharedComponents(registry);
      registry.register(
        defineComponent({
          id: "example.Spin",
          displayName: "Spin",
          category: "UI",
          categoryOrder: 20,
          order: 1,
          properties: {
            speed: { kind: "number", default: 1.5 },
          },
        }),
      );
    });
    return editor;
  }

  it("adds a script, undoes, and redoes", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");

    const componentId = editor.addScriptComponent(nodeId, SHARED_METER);
    const node = editor.getScene().nodes[0]!;
    expect(getScriptComponents(node)).toHaveLength(1);
    expect(findScript(node, SHARED_METER)?.id).toBe(componentId);
    expect(findScript(node, SHARED_METER)?.properties.refreshIntervalMs).toBe(
      250,
    );

    editor.undo();
    expect(getScriptComponents(editor.getScene().nodes[0]!)).toHaveLength(0);

    editor.redo();
    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.id).toBe(
      componentId,
    );
  });

  it("rejects duplicate singleton scripts", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    editor.addScriptComponent(nodeId, SHARED_METER);
    expect(() => editor.addScriptComponent(nodeId, SHARED_METER)).toThrow(
      /already on node/,
    );
  });

  it("removes a script with undo restoring order", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    editor.addScriptComponent(nodeId, SHARED_METER);
    const spinId = editor.addScriptComponent(nodeId, "example.Spin");

    editor.removeComponent(nodeId, spinId);
    expect(
      getScriptComponents(editor.getScene().nodes[0]!).map((c) => c.scriptId),
    ).toEqual([SHARED_METER]);

    editor.undo();
    expect(
      getScriptComponents(editor.getScene().nodes[0]!).map((c) => c.scriptId),
    ).toEqual([SHARED_METER, "example.Spin"]);
  });

  it("patches script properties with undo", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    const componentId = editor.addScriptComponent(nodeId, SHARED_METER);

    editor.setScriptProperties(nodeId, componentId, {
      refreshIntervalMs: 42,
    });
    expect(
      findScript(editor.getScene().nodes[0]!, SHARED_METER)?.properties
        .refreshIntervalMs,
    ).toBe(42);

    editor.undo();
    expect(
      findScript(editor.getScene().nodes[0]!, SHARED_METER)?.properties
        .refreshIntervalMs,
    ).toBe(250);
  });

  it("patchComponent uses the same undo path as setScriptProperties", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    const componentId = editor.addScriptComponent(nodeId, SHARED_METER);

    editor.patchComponent(nodeId, componentId, { refreshIntervalMs: 80 });
    expect(
      findScript(editor.getScene().nodes[0]!, SHARED_METER)?.properties
        .refreshIntervalMs,
    ).toBe(80);
    editor.undo();
    expect(
      findScript(editor.getScene().nodes[0]!, SHARED_METER)?.properties
        .refreshIntervalMs,
    ).toBe(250);
  });

  it("toggles script enabled with undo", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    const componentId = editor.addScriptComponent(nodeId, SHARED_METER);

    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.enabled).toBe(
      undefined,
    );

    editor.setScriptEnabled(nodeId, componentId, false);
    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.enabled).toBe(
      false,
    );

    editor.undo();
    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.enabled).toBe(
      undefined,
    );

    editor.redo();
    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.enabled).toBe(
      false,
    );

    editor.setScriptEnabled(nodeId, componentId, true);
    expect(findScript(editor.getScene().nodes[0]!, SHARED_METER)?.enabled).toBe(
      undefined,
    );
  });
});
