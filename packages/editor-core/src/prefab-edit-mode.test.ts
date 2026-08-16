import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createEmptyScene,
  createSpriteNode,
  getSprite,
  getTransform2D,
  PREFAB_SCHEMA_VERSION,
  type PrefabData,
} from "@game-editor/scene";
import { Editor } from "./editor.js";
import { InstantiatePrefabCommand } from "./commands/instantiate-prefab-command.js";

const PREFAB_ASSET_ID = "asset_prefab_button";

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

function editorWithButtonInstance(): Editor {
  const scene = createEmptyScene("Main", { renderer: "hybrid" });
  const editor = new Editor({ scene });
  const prefab = buttonPrefab();
  editor.prefabs.set(PREFAB_ASSET_ID, prefab);
  editor.execute(
    new InstantiatePrefabCommand(editor.document, editor.selection, {
      prefab,
      prefabAssetId: PREFAB_ASSET_ID,
      position2D: { x: 80, y: 520 },
    }),
  );
  editor.document.markSaved();
  return editor;
}

describe("prefab edit mode", () => {
  it("opens a cloned prefab document and keeps the host renderer", async () => {
    const editor = editorWithButtonInstance();
    const catalogRoot = editor.prefabs.get(PREFAB_ASSET_ID)!.root;

    await editor.openPrefab(PREFAB_ASSET_ID);

    expect(editor.prefabs.getMode().kind).toBe("prefab");
    expect(editor.getScene().renderer).toBe("hybrid");
    expect(editor.getScene().nodes[0]).not.toBe(catalogRoot);
    expect(editor.getScene().nodes[0]?.id).toBe(catalogRoot.id);
    expect(editor.selection.getPrimaryNodeId()).toBe(catalogRoot.id);

    const sourceSprite = editor.getScene().nodes[0]!.children[0]!;
    editor.setVisualComponent(sourceSprite.id, { tint: 0xff0000 });
    expect(getSprite(catalogRoot.children[0]!)?.tint).toBe(0xffffff);
  });

  it("saves an isolated catalog copy and refreshes instances on close", async () => {
    const editor = editorWithButtonInstance();
    await editor.openPrefab(PREFAB_ASSET_ID);

    const sourceSprite = editor.getScene().nodes[0]!.children[0]!;
    editor.setVisualComponent(sourceSprite.id, { tint: 0xff0000 });
    await editor.saveScene();

    const savedRoot = editor.prefabs.get(PREFAB_ASSET_ID)!.root;
    expect(savedRoot).not.toBe(editor.getScene().nodes[0]);
    expect(getSprite(savedRoot.children[0]!)?.tint).toBe(0xff0000);

    await editor.closePrefab();

    expect(editor.prefabs.getMode().kind).toBe("scene");
    expect(getSprite(editor.getScene().nodes[0]!.children[0]!)?.tint).toBe(
      0xff0000,
    );
    expect(getTransform2D(editor.getScene().nodes[0]!)?.position).toEqual({
      x: 80,
      y: 520,
    });
    expect(editor.hasUnsavedChanges()).toBe(true);
  });

  it("keeps instance overrides when the prefab source changes", async () => {
    const editor = editorWithButtonInstance();
    const instanceSprite = editor.getScene().nodes[0]!.children[0]!;
    editor.setVisualComponent(instanceSprite.id, { tint: 0x00ff00 });
    editor.document.markSaved();

    await editor.openPrefab(PREFAB_ASSET_ID);
    const sourceSprite = editor.getScene().nodes[0]!.children[0]!;
    editor.setVisualComponent(sourceSprite.id, { tint: 0xff0000 });
    await editor.closePrefab();

    expect(getSprite(editor.getScene().nodes[0]!.children[0]!)?.tint).toBe(
      0x00ff00,
    );
  });

  it("does not dirty a clean scene when closing an unchanged prefab", async () => {
    const editor = editorWithButtonInstance();
    await editor.openPrefab(PREFAB_ASSET_ID);
    await editor.closePrefab();
    expect(editor.hasUnsavedChanges()).toBe(false);
    expect(getSprite(editor.getScene().nodes[0]!.children[0]!)?.tint).toBe(
      0xffffff,
    );
  });
});
