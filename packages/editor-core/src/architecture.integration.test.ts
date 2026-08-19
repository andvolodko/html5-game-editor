import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createEmptyScene,
  createSpriteNode,
  findScript,
  getSprite,
  parseSceneData,
  PREFAB_SCHEMA_VERSION,
  type PrefabData,
} from "@game-editor/scene";
import {
  defineComponent,
  registerSharedComponents,
} from "@game-editor/game-components";
import { InstantiatePrefabCommand } from "./commands/instantiate-prefab-command.js";
import { Editor } from "./editor.js";

describe("architecture integration", () => {
  it("hierarchy create/rename/reparent/duplicate/delete undo and redo", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    const parentId = editor.createContainer();
    editor.renameNode(parentId, "Folder");
    const childId = editor.createSprite("Hero", { x: 4, y: 8 });
    editor.moveNode(childId, parentId, 0);
    expect(editor.document.getNode(childId)?.parentId).toBe(parentId);

    editor.selectNodes([childId]);
    const copyId = editor.duplicateNode();
    expect(copyId).toBeDefined();
    expect(editor.document.getNode(parentId)?.children).toHaveLength(2);

    editor.selectNodes([copyId!]);
    editor.deleteSelectedNodes();
    expect(editor.document.getNode(parentId)?.children).toHaveLength(1);
    editor.undo();
    expect(editor.document.getNode(parentId)?.children).toHaveLength(2);
    editor.redo();
    expect(editor.document.getNode(parentId)?.children).toHaveLength(1);
  });

  it("script component patch serializes and reloads", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    editor.replaceComponentCatalog((registry) => {
      registerSharedComponents(registry);
      registry.register(
        defineComponent({
          id: "example.Spin",
          displayName: "Spin",
          category: "UI",
          categoryOrder: 1,
          order: 1,
          properties: { speed: { kind: "number", default: 1 } },
        }),
      );
    });
    const nodeId = editor.createSprite("Hero");
    const componentId = editor.addScriptComponent(nodeId, "example.Spin");
    editor.patchComponent(nodeId, componentId, { speed: 5 });
    editor.undo();
    editor.redo();

    const json = JSON.stringify(editor.getScene());
    const parsed = parseSceneData(JSON.parse(json));
    expect(findScript(parsed.nodes[0]!, "example.Spin")?.properties.speed).toBe(
      5,
    );
  });

  it("prefab instantiate/override serializes and reloads", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    const prefab = buttonPrefab();
    editor.prefabs.set("asset_prefab_button", prefab);
    editor.execute(
      new InstantiatePrefabCommand(editor.document, editor.selection, {
        prefab,
        prefabAssetId: "asset_prefab_button",
        position2D: { x: 12, y: 24 },
      }),
    );
    const instance = editor.getScene().nodes[0]!;
    const sprite = getSprite(instance.children[0]!);
    if (sprite) {
      sprite.tint = 0xff0000;
    }
    editor.prefabs.syncOverrides(editor.document);

    const parsed = parseSceneData(JSON.parse(JSON.stringify(editor.getScene())));
    expect(parsed.nodes[0]?.prefab?.prefabAssetId).toBe("asset_prefab_button");
    expect(parsed.nodes[0]?.prefab?.overrides?.length).toBeGreaterThan(0);
    expect(getSprite(parsed.nodes[0]!.children[0]!)?.tint).toBe(0xff0000);
  });
});

function buttonPrefab(): PrefabData {
  const root = createContainerNode("Button");
  const sprite = createSpriteNode("Icon", { x: 0, y: 0 }, {
    assetId: "asset_tex",
    tint: 0xffffff,
  });
  sprite.parentId = root.id;
  root.children = [sprite];
  return {
    version: PREFAB_SCHEMA_VERSION,
    id: "prefab_button",
    name: "Button",
    root,
  };
}
