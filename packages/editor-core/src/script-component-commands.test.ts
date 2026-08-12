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

    const componentId = editor.addScriptComponent(nodeId, "shared.Health");
    const node = editor.getScene().nodes[0]!;
    expect(getScriptComponents(node)).toHaveLength(1);
    expect(findScript(node, "shared.Health")?.id).toBe(componentId);
    expect(findScript(node, "shared.Health")?.properties.maxHp).toBe(100);

    editor.undo();
    expect(getScriptComponents(editor.getScene().nodes[0]!)).toHaveLength(0);

    editor.redo();
    expect(findScript(editor.getScene().nodes[0]!, "shared.Health")?.id).toBe(
      componentId,
    );
  });

  it("rejects duplicate singleton scripts", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    editor.addScriptComponent(nodeId, "shared.Health");
    expect(() => editor.addScriptComponent(nodeId, "shared.Health")).toThrow(
      /already on node/,
    );
  });

  it("removes a script with undo restoring order", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    editor.addScriptComponent(nodeId, "shared.Health");
    const spinId = editor.addScriptComponent(nodeId, "example.Spin");

    editor.removeComponent(nodeId, spinId);
    expect(
      getScriptComponents(editor.getScene().nodes[0]!).map((c) => c.scriptId),
    ).toEqual(["shared.Health"]);

    editor.undo();
    expect(
      getScriptComponents(editor.getScene().nodes[0]!).map((c) => c.scriptId),
    ).toEqual(["shared.Health", "example.Spin"]);
  });

  it("patches script properties with undo", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    const componentId = editor.addScriptComponent(nodeId, "shared.Health");

    editor.setScriptProperties(nodeId, componentId, { currentHp: 42 });
    expect(
      findScript(editor.getScene().nodes[0]!, "shared.Health")?.properties
        .currentHp,
    ).toBe(42);

    editor.undo();
    expect(
      findScript(editor.getScene().nodes[0]!, "shared.Health")?.properties
        .currentHp,
    ).toBe(100);
  });
});
