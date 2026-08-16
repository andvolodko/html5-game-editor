import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createEmptyScene,
  createPrefabFromSubtree,
  createSpriteNode,
  getSprite,
  getTransform2D,
  PREFAB_SCHEMA_VERSION,
  type PrefabData,
} from "@game-editor/scene";
import { Editor } from "./editor.js";
import { ConvertSubtreeToPrefabInstanceCommand } from "./commands/convert-subtree-to-prefab-instance-command.js";
import { InstantiatePrefabCommand } from "./commands/instantiate-prefab-command.js";
import { UnpackPrefabCommand } from "./commands/unpack-prefab-command.js";
import { RevertPrefabOverridesCommand } from "./commands/revert-prefab-overrides-command.js";

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

describe("prefab commands", () => {
  it("instantiate undo/redo restores the subtree as one step", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    const prefab = buttonPrefab();
    editor.prefabs.set(PREFAB_ASSET_ID, prefab);
    editor.execute(
      new InstantiatePrefabCommand(editor.document, editor.selection, {
        prefab,
        prefabAssetId: PREFAB_ASSET_ID,
        position2D: { x: 40, y: 80 },
      }),
    );
    expect(editor.getScene().nodes).toHaveLength(1);
    expect(editor.getScene().nodes[0]?.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
    expect(getTransform2D(editor.getScene().nodes[0]!)?.position).toEqual({
      x: 40,
      y: 80,
    });
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
    editor.redo();
    expect(editor.getScene().nodes).toHaveLength(1);
    expect(editor.getScene().nodes[0]?.children).toHaveLength(1);
  });

  it("unpack undo/redo restores the prefab relationship", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    const prefab = buttonPrefab();
    editor.prefabs.set(PREFAB_ASSET_ID, prefab);
    editor.execute(
      new InstantiatePrefabCommand(editor.document, editor.selection, {
        prefab,
        prefabAssetId: PREFAB_ASSET_ID,
      }),
    );
    const rootId = editor.getScene().nodes[0]!.id;
    editor.execute(new UnpackPrefabCommand(editor.document, editor.selection, rootId));
    expect(editor.getScene().nodes[0]?.prefab).toBeUndefined();
    editor.undo();
    expect(editor.getScene().nodes[0]?.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
    editor.redo();
    expect(editor.getScene().nodes[0]?.prefab).toBeUndefined();
  });

  it("revert undo/redo restores the override", () => {
    const editor = new Editor({ scene: createEmptyScene("Main") });
    const prefab = buttonPrefab();
    editor.prefabs.set(PREFAB_ASSET_ID, prefab);
    editor.execute(
      new InstantiatePrefabCommand(editor.document, editor.selection, {
        prefab,
        prefabAssetId: PREFAB_ASSET_ID,
      }),
    );
    const root = editor.getScene().nodes[0]!;
    const sprite = getSprite(root.children[0]!);
    if (sprite) {
      sprite.tint = 0xff0000;
    }
    editor.prefabs.syncOverrides(editor.document);
    expect(root.prefab?.overrides?.length).toBeGreaterThan(0);
    editor.execute(
      new RevertPrefabOverridesCommand(
        editor.document,
        editor.selection,
        root.id,
        prefab,
        editor.prefabs.getCatalog(),
      ),
    );
    expect(getSprite(editor.getScene().nodes[0]!.children[0]!)?.tint).toBe(0xffffff);
    editor.undo();
    expect(getSprite(editor.getScene().nodes[0]!.children[0]!)?.tint).toBe(0xff0000);
  });

  it("createPrefabFromSubtree conversion is undoable", () => {
    const scene = createEmptyScene("Main");
    const root = createContainerNode("Player");
    const child = createSpriteNode("Body", { x: 1, y: 2 }, { assetId: "asset_tex" });
    child.parentId = root.id;
    root.children = [child];
    scene.nodes = [root];
    const editor = new Editor({ scene });
    const { prefab, instance } = createPrefabFromSubtree(root, {
      prefabAssetId: PREFAB_ASSET_ID,
    });
    editor.prefabs.set(PREFAB_ASSET_ID, prefab);
    editor.execute(
      new ConvertSubtreeToPrefabInstanceCommand(
        editor.document,
        editor.selection,
        root.id,
        instance,
      ),
    );
    expect(editor.getScene().nodes[0]?.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
    expect(editor.getScene().nodes[0]?.id).toBe(root.id);
    editor.undo();
    expect(editor.getScene().nodes[0]?.prefab).toBeUndefined();
    editor.redo();
    expect(editor.getScene().nodes[0]?.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
  });
});
