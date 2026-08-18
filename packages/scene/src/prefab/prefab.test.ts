import { describe, expect, it } from "vitest";
import {
  collectReferencedAssetIds,
  createContainerNode,
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
  createTextComponent,
  getSprite,
  getText,
  getTransform2D,
  insertNodeInScene,
  parseSceneData,
} from "../index.js";
import {
  applyOverridesToPrefabAsset,
  computePrefabOverrides,
  createPrefabFromSubtree,
  instantiatePrefab,
  instantiatePrefabResolved,
  parsePrefabData,
  PREFAB_SCHEMA_VERSION,
  resolvePrefabInstance,
  resolveScenePrefabs,
  serializePrefabData,
  unpackPrefabInstance,
  type PrefabCatalog,
  type PrefabData,
} from "./index.js";
import type { SceneNodeData } from "../types.js";

const PREFAB_ASSET_ID = "asset_prefab_player";
const TEXTURE_ASSET_ID = "asset_texture_body";

function buildPlayerPrefab(): PrefabData {
  const root = createContainerNode("Player");
  const body = createSpriteNode("Body", { x: 0, y: 0 }, {
    assetId: TEXTURE_ASSET_ID,
    tint: 0xffffff,
  });
  const label = createContainerNode("Label");
  label.components.push(
    createTextComponent({ text: "Hero" }),
  );
  const health = createContainerNode("Health");
  health.components.push(
    createScriptComponent("shared.Health", { max: 100 }),
  );
  body.parentId = root.id;
  label.parentId = root.id;
  health.parentId = root.id;
  root.children = [body, label, health];
  const transform = getTransform2D(root);
  if (transform) {
    transform.position = { x: 0, y: 0 };
  }
  return {
    version: PREFAB_SCHEMA_VERSION,
    id: "prefab_player",
    name: "Player",
    root,
  };
}

function catalogOf(prefab: PrefabData, assetId = PREFAB_ASSET_ID): PrefabCatalog {
  return new Map([[assetId, prefab]]);
}

function sourceId(node: SceneNodeData): string {
  const sourceNodeId = node.prefab?.sourceNodeId;
  if (sourceNodeId === undefined) {
    throw new Error("expected prefab source mapping");
  }
  return sourceNodeId;
}

describe("prefab instantiate", () => {
  it("generates unique scene IDs and stable source mapping", () => {
    const prefab = buildPlayerPrefab();
    const first = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const second = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });

    expect(first.node.id).not.toBe(prefab.root.id);
    expect(first.node.id).not.toBe(second.node.id);
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.node.prefab?.isRoot).toBe(true);
    expect(first.node.prefab?.sourceNodeId).toBe(prefab.root.id);
    expect(second.node.prefab?.sourceNodeId).toBe(prefab.root.id);

    const firstIds = collectIds(first.node);
    const secondIds = collectIds(second.node);
    for (const id of firstIds) {
      expect(secondIds.has(id)).toBe(false);
    }

    expect(sourceId(first.node.children[0]!)).toBe(prefab.root.children[0]!.id);
    expect(sourceId(second.node.children[0]!)).toBe(prefab.root.children[0]!.id);
    expect(first.node.children[0]!.id).not.toBe(prefab.root.children[0]!.id);
  });

  it("preserves components, asset refs, and scripts", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    expect(getSprite(node.children[0]!)?.assetId).toBe(TEXTURE_ASSET_ID);
    const label = node.children[1];
    expect(getText(label!)?.text).toBe("Hero");
    const health = node.children[2]?.components.find((component) => component.type === "Script");
    expect(health).toMatchObject({ scriptId: "shared.Health", properties: { max: 100 } });
  });

  it("records placement as an override without changing the prefab", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, {
      prefabAssetId: PREFAB_ASSET_ID,
      position2D: { x: 500, y: 300 },
    });
    expect(getTransform2D(node)?.position).toEqual({ x: 500, y: 300 });
    expect(getTransform2D(prefab.root)?.position).toEqual({ x: 0, y: 0 });
    expect(node.prefab?.overrides?.some((override) => override.kind === "property")).toBe(
      true,
    );
  });
});

describe("prefab overrides", () => {
  it("property overrides win over prefab values", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const sprite = getSprite(node.children[0]!);
    if (!sprite) {
      throw new Error("missing sprite");
    }
    sprite.tint = 0xff0000;
    const transform = getTransform2D(node);
    if (transform) {
      transform.position = { x: 600, y: 0 };
    }
    const overrides = computePrefabOverrides(prefab.root, node);
    node.prefab!.overrides = overrides;
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(getSprite(resolved.node.children[0]!)?.tint).toBe(0xff0000);
    expect(getTransform2D(resolved.node)?.position).toEqual({ x: 600, y: 0 });
  });

  it("copies runtime visibility and records a visible override", () => {
    const prefab = buildPlayerPrefab();
    prefab.root.visible = false;
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    expect(node.visible).toBe(false);
    delete node.visible;
    const overrides = computePrefabOverrides(prefab.root, node);
    expect(overrides).toContainEqual({
      kind: "visible",
      sourceNodeId: prefab.root.id,
      value: true,
    });
    node.prefab!.overrides = overrides;
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(resolved.node.visible).toBeUndefined();
  });

  it("copies runtime alpha and records an alpha override", () => {
    const prefab = buildPlayerPrefab();
    prefab.root.alpha = 0.4;
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    expect(node.alpha).toBe(0.4);
    delete node.alpha;
    const overrides = computePrefabOverrides(prefab.root, node);
    expect(overrides).toContainEqual({
      kind: "alpha",
      sourceNodeId: prefab.root.id,
      value: 1,
    });
    node.prefab!.overrides = overrides;
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(resolved.node.alpha).toBeUndefined();
  });

  it("non-overridden prefab updates propagate", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const sprite = getSprite(node.children[0]!);
    if (sprite) {
      sprite.tint = 0xff0000;
    }
    node.prefab!.overrides = computePrefabOverrides(prefab.root, node);

    const health = prefab.root.children[2]?.components.find(
      (component) => component.type === "Script",
    );
    if (health?.type === "Script") {
      health.properties.max = 150;
    }

    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(getSprite(resolved.node.children[0]!)?.tint).toBe(0xff0000);
    const resolvedHealth = resolved.node.children[2]?.components.find(
      (component) => component.type === "Script",
    );
    expect(resolvedHealth).toMatchObject({ properties: { max: 150 } });
  });

  it("revert property restores the prefab value", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const sprite = getSprite(node.children[0]!);
    if (sprite) {
      sprite.tint = 0xff0000;
    }
    let overrides = computePrefabOverrides(prefab.root, node);
    overrides = overrides.filter(
      (override) => !(override.kind === "property" && override.propertyPath === "tint"),
    );
    node.prefab!.overrides = overrides;
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(getSprite(resolved.node.children[0]!)?.tint).toBe(0xffffff);
  });

  it("revert all restores inherited values and keeps the instance", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const transform = getTransform2D(node);
    if (transform) {
      transform.position = { x: 80, y: 40 };
    }
    node.prefab!.overrides = [];
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    expect(resolved.node.id).toBe(node.id);
    expect(resolved.node.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
    expect(getTransform2D(resolved.node)?.position).toEqual({ x: 0, y: 0 });
  });
});

describe("prefab unpack and local children", () => {
  it("unpack produces an equivalent plain node tree", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const unpacked = unpackPrefabInstance(node);
    expect(unpacked.prefab).toBeUndefined();
    expect(unpacked.children.every((child) => child.prefab === undefined)).toBe(true);
    expect(unpacked.name).toBe(node.name);
    expect(unpacked.children).toHaveLength(node.children.length);
    expect(getSprite(unpacked.children[0]!)?.assetId).toBe(TEXTURE_ASSET_ID);
  });

  it("local children survive prefab resolution", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const local = createSpriteNode("DebugText", { x: 10, y: 10 });
    local.parentId = node.id;
    node.children.push(local);
    const resolved = resolvePrefabInstance(prefab, node, catalogOf(prefab));
    const surviving = resolved.node.children.find((child) => child.id === local.id);
    expect(surviving?.name).toBe("DebugText");
    expect(surviving?.prefab).toBeUndefined();
  });
});

describe("missing and nested prefabs", () => {
  it("keeps instance data when the prefab asset is missing", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const scene = createEmptyScene("Main");
    insertNodeInScene(scene, node, undefined, 0);
    const { scene: resolved, warnings } = resolveScenePrefabs(scene, new Map());
    expect(resolved.nodes[0]?.id).toBe(node.id);
    expect(resolved.nodes[0]?.children).toHaveLength(node.children.length);
    expect(warnings.some((warning) => warning.code === "MISSING_PREFAB")).toBe(true);
  });

  it("resolves nested prefabs and detects cycles", () => {
    const weapon = buildPlayerPrefab();
    weapon.id = "prefab_weapon";
    weapon.name = "Weapon";
    weapon.root.name = "Weapon";
    const enemyRoot = createContainerNode("Enemy");
    const { node: weaponInstance } = instantiatePrefab(weapon, {
      prefabAssetId: "asset_prefab_weapon",
    });
    weaponInstance.parentId = enemyRoot.id;
    enemyRoot.children = [weaponInstance];
    const enemy: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_enemy",
      name: "Enemy",
      root: enemyRoot,
    };
    const catalog: PrefabCatalog = new Map([
      ["asset_prefab_weapon", weapon],
      ["asset_prefab_enemy", enemy],
    ]);
    const resolved = instantiatePrefabResolved(enemy, {
      prefabAssetId: "asset_prefab_enemy",
      catalog,
    });
    expect(resolved.node.children[0]?.prefab?.prefabAssetId).toBe("asset_prefab_weapon");
    expect(resolved.warnings).toEqual([]);

    const cyclicA: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_a",
      name: "A",
      root: createContainerNode("A"),
    };
    const cyclicB: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_b",
      name: "B",
      root: createContainerNode("B"),
    };
    const { node: aAsChild } = instantiatePrefab(cyclicA, { prefabAssetId: "asset_a" });
    cyclicB.root.children = [aAsChild];
    const { node: bAsChild } = instantiatePrefab(cyclicB, { prefabAssetId: "asset_b" });
    cyclicA.root.children = [bAsChild];
    const cyclicCatalog: PrefabCatalog = new Map([
      ["asset_a", cyclicA],
      ["asset_b", cyclicB],
    ]);
    const cyclic = instantiatePrefabResolved(cyclicA, {
      prefabAssetId: "asset_a",
      catalog: cyclicCatalog,
    });
    expect(cyclic.warnings.some((warning) => warning.code === "PREFAB_CYCLE")).toBe(true);
  });

  it("asset collection walks prefabs without looping", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const scene = createEmptyScene("Main");
    insertNodeInScene(scene, node, undefined, 0);
    const ids = collectReferencedAssetIds(scene, catalogOf(prefab));
    expect(ids).toContain(PREFAB_ASSET_ID);
    expect(ids).toContain(TEXTURE_ASSET_ID);

    const cyclicA: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_a",
      name: "A",
      root: createContainerNode("A"),
    };
    const cyclicB: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_b",
      name: "B",
      root: createContainerNode("B"),
    };
    cyclicA.root.prefab = {
      prefabAssetId: "asset_b",
      instanceId: "pinst_loop_a",
      sourceNodeId: cyclicB.root.id,
      componentSources: {},
      isRoot: true,
    };
    cyclicB.root.prefab = {
      prefabAssetId: "asset_a",
      instanceId: "pinst_loop_b",
      sourceNodeId: cyclicA.root.id,
      componentSources: {},
      isRoot: true,
    };
    const loopScene = createEmptyScene("Loop");
    const stub = createContainerNode("Stub");
    stub.prefab = {
      prefabAssetId: "asset_a",
      instanceId: "pinst_scene",
      sourceNodeId: cyclicA.root.id,
      componentSources: {},
      isRoot: true,
    };
    loopScene.nodes = [stub];
    expect(() =>
      collectReferencedAssetIds(
        loopScene,
        new Map([
          ["asset_a", cyclicA],
          ["asset_b", cyclicB],
        ]),
      ),
    ).not.toThrow();
  });
});

describe("prefab serialization", () => {
  it("round-trips prefab JSON", () => {
    const prefab = buildPlayerPrefab();
    const parsed = parsePrefabData(JSON.parse(serializePrefabData(prefab)));
    expect(parsed.id).toBe(prefab.id);
    expect(parsed.root.name).toBe("Player");
    expect(parsed.root.children).toHaveLength(3);
  });

  it("round-trips a scene containing a prefab instance", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, {
      prefabAssetId: PREFAB_ASSET_ID,
      position2D: { x: 120, y: 40 },
    });
    const scene = createEmptyScene("Main");
    insertNodeInScene(scene, node, undefined, 0);
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(parsed.nodes[0]?.prefab?.prefabAssetId).toBe(PREFAB_ASSET_ID);
    expect(parsed.nodes[0]?.prefab?.sourceNodeId).toBe(prefab.root.id);
    expect(parsed.nodes[0]?.prefab?.overrides?.length).toBeGreaterThan(0);
  });

  it("createPrefabFromSubtree converts the source into an instance", () => {
    const root = createContainerNode("Button");
    const sprite = createSpriteNode("Icon", { x: 0, y: 0 }, { assetId: TEXTURE_ASSET_ID });
    sprite.parentId = root.id;
    root.children = [sprite];
    const { prefab, instance } = createPrefabFromSubtree(root, {
      prefabAssetId: "asset_prefab_button",
    });
    expect(instance.id).toBe(root.id);
    expect(instance.prefab?.isRoot).toBe(true);
    expect(instance.prefab?.prefabAssetId).toBe("asset_prefab_button");
    expect(instance.children[0]?.id).toBe(sprite.id);
    expect(instance.children[0]?.prefab?.sourceNodeId).toBe(prefab.root.children[0]?.id);
    expect(prefab.root.id).not.toBe(root.id);
  });

  it("apply overrides writes values back into the prefab document", () => {
    const prefab = buildPlayerPrefab();
    const { node } = instantiatePrefab(prefab, { prefabAssetId: PREFAB_ASSET_ID });
    const sprite = getSprite(node.children[0]!);
    if (sprite) {
      sprite.tint = 0x00ff00;
    }
    const overrides = computePrefabOverrides(prefab.root, node);
    const updated = applyOverridesToPrefabAsset(prefab, overrides);
    expect(getSprite(updated.root.children[0]!)?.tint).toBe(0x00ff00);
  });
});

function collectIds(node: SceneNodeData): Set<string> {
  const ids = new Set<string>([node.id]);
  for (const component of node.components) {
    ids.add(component.id);
  }
  for (const child of node.children) {
    for (const id of collectIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}
