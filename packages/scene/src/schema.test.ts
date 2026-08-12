import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  parseSceneData,
  SCENE_SCHEMA_VERSION,
  type SceneData,
} from "./index.js";

describe("scene schema", () => {
  it("creates a versioned empty scene", () => {
    const scene = createEmptyScene("Main");
    expect(scene.version).toBe(SCENE_SCHEMA_VERSION);
    expect(scene.name).toBe("Main");
    expect(scene.nodes).toEqual([]);
  });

  it("validates a Transform2D scene document", () => {
    const input: SceneData = {
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "SpriteRoot",
          components: [
            {
              type: "Transform2D",
              id: "comp_1",
              position: { x: 10, y: 20 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            },
          ],
          children: [],
        },
      ],
    };

    const parsed = parseSceneData(input);
    expect(parsed.nodes[0]?.components[0]?.type).toBe("Transform2D");
  });

  it("rejects invalid scene documents", () => {
    expect(() => parseSceneData({ id: "", name: "x", version: 1, nodes: [] })).toThrow();
  });
});
