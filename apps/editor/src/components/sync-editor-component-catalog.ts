import type { Editor } from "@game-editor/editor-core";
import { installActiveGameRuntime } from "./install-active-game-runtime.js";

/**
 * Loads the active project's script component catalog via project-server,
 * then re-attaches game-local `create` factories for preview / runtime.
 */
export async function syncEditorComponentCatalog(
  editor: Editor,
): Promise<void> {
  await editor.refreshComponentCatalog();
  await installActiveGameRuntime(
    editor.project.getActiveProjectId(),
    editor.components,
  );
}
