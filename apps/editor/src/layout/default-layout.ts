import type { DockviewApi } from "dockview";
import { EDITOR_PANEL_IDS } from "../settings/editor-settings-storage";

/**
 * Canonical default docking layout. Single definition — do not duplicate sizes elsewhere.
 */
export function applyDefaultEditorLayout(api: DockviewApi): void {
  for (const panel of [...api.panels]) {
    panel.api.close();
  }

  const scene = api.addPanel({
    id: EDITOR_PANEL_IDS.scene,
    component: EDITOR_PANEL_IDS.scene,
    title: "Scene",
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.hierarchy,
    component: EDITOR_PANEL_IDS.hierarchy,
    title: "Hierarchy",
    position: { referencePanel: scene, direction: "left" },
    initialWidth: 260,
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.inspector,
    component: EDITOR_PANEL_IDS.inspector,
    title: "Inspector",
    position: { referencePanel: scene, direction: "right" },
    initialWidth: 280,
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.projectSettings,
    component: EDITOR_PANEL_IDS.projectSettings,
    title: "Project Settings",
    position: { referencePanel: EDITOR_PANEL_IDS.inspector, direction: "within" },
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.assetPreview,
    component: EDITOR_PANEL_IDS.assetPreview,
    title: "Asset Preview",
    position: { referencePanel: EDITOR_PANEL_IDS.inspector, direction: "below" },
    initialHeight: 260,
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.assets,
    component: EDITOR_PANEL_IDS.assets,
    title: "Assets",
    position: { referencePanel: EDITOR_PANEL_IDS.hierarchy, direction: "below" },
    // No initialHeight: dockview distributes the left column equally with Hierarchy (50%).
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.console,
    component: EDITOR_PANEL_IDS.console,
    title: "Console",
    position: { referencePanel: scene, direction: "below" },
    initialHeight: 200,
  });

  api.addPanel({
    id: EDITOR_PANEL_IDS.preview,
    component: EDITOR_PANEL_IDS.preview,
    title: "Preview",
    position: { referencePanel: scene, direction: "within" },
    inactive: true,
  });
  scene.api.setActive();
}
