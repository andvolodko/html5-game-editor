import type { SceneListEntry } from "@game-editor/editor-core";

export interface StartSceneSelectOption {
  value: string;
  label: string;
}

/**
 * Builds <select> options for start scene.
 * Keeps an orphan current id visible so a missing scene file is not cleared.
 */
export function buildStartSceneSelectOptions(
  scenes: readonly SceneListEntry[],
  currentId: string | undefined,
): StartSceneSelectOption[] {
  const sorted = scenes.slice().sort((a, b) => a.id.localeCompare(b.id));
  const options: StartSceneSelectOption[] = sorted.map((scene) => ({
    value: scene.id,
    label: scene.id,
  }));

  if (
    currentId !== undefined &&
    currentId.length > 0 &&
    !sorted.some((scene) => scene.id === currentId)
  ) {
    options.unshift({
      value: currentId,
      label: `(missing) ${currentId}`,
    });
  }

  return options;
}
