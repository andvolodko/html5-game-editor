import { describe, expect, it, vi } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import { resolvePreviewScene } from "./resolve-preview-scene";

describe("resolvePreviewScene", () => {
  it("clones the live editor document when the id is the open scene", async () => {
    const live = createEmptyScene("Live");
    const loadSceneData = vi.fn();
    const snapshot = await resolvePreviewScene(
      {
        getSceneFileId: () => "main",
        getScene: () => live,
        loadSceneData,
      },
      "main",
    );
    expect(snapshot.name).toBe("Live");
    expect(snapshot).not.toBe(live);
    expect(loadSceneData).not.toHaveBeenCalled();
  });

  it("loads a saved scene when previewing a different file", async () => {
    const saved = createEmptyScene("Spine");
    const snapshot = await resolvePreviewScene(
      {
        getSceneFileId: () => "main",
        getScene: () => createEmptyScene("Live"),
        loadSceneData: async (id) => {
          expect(id).toBe("spine");
          return saved;
        },
      },
      "spine",
    );
    expect(snapshot).toBe(saved);
  });
});
