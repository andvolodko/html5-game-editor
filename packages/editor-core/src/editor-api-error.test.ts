import { describe, expect, it } from "vitest";
import {
  PROJECT_SERVER_OFFLINE_MESSAGE,
  formatEditorApiError,
  formatEditorApiErrorMessage,
  uniquePanelErrorMessages,
} from "./editor-api-error.js";

describe("editor-api-error", () => {
  it("maps browser/node fetch failures to an offline message", () => {
    expect(formatEditorApiErrorMessage("Failed to fetch")).toBe(
      PROJECT_SERVER_OFFLINE_MESSAGE,
    );
    expect(formatEditorApiErrorMessage("fetch failed")).toBe(
      PROJECT_SERVER_OFFLINE_MESSAGE,
    );
    expect(
      formatEditorApiErrorMessage("NetworkError when attempting to fetch resource."),
    ).toBe(PROJECT_SERVER_OFFLINE_MESSAGE);
    expect(formatEditorApiError(new TypeError("Failed to fetch"), "fallback")).toBe(
      PROJECT_SERVER_OFFLINE_MESSAGE,
    );
  });

  it("leaves HTTP and domain errors unchanged", () => {
    expect(formatEditorApiErrorMessage("Failed to fetch spine atlas (404)")).toBe(
      "Failed to fetch spine atlas (404)",
    );
    expect(formatEditorApiErrorMessage("Create folder failed")).toBe(
      "Create folder failed",
    );
    expect(formatEditorApiError(new Error(""), "Failed to list scenes")).toBe(
      "Failed to list scenes",
    );
  });

  it("shows one offline line when assets and scenes both fail to fetch", () => {
    expect(
      uniquePanelErrorMessages("Failed to fetch", "Failed to fetch", null),
    ).toEqual([PROJECT_SERVER_OFFLINE_MESSAGE]);
    expect(
      uniquePanelErrorMessages("Failed to fetch", "Create folder failed"),
    ).toEqual([PROJECT_SERVER_OFFLINE_MESSAGE, "Create folder failed"]);
  });
});
