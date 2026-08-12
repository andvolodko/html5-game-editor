import {
  DockviewReact,
  type DockviewReadyEvent,
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { HierarchyPanel } from "../panels/HierarchyPanel";
import { ScenePanel } from "../panels/ScenePanel";
import { AssetsPanel } from "../panels/AssetsPanel";
import { InspectorPanel } from "../panels/InspectorPanel";
import { BottomPanel } from "../panels/BottomPanel";

const components = {
  hierarchy: () => <HierarchyPanel />,
  scene: () => <ScenePanel />,
  assets: () => <AssetsPanel />,
  inspector: () => <InspectorPanel />,
  bottom: () => <BottomPanel />,
};

export function DockLayout() {
  const onReady = (event: DockviewReadyEvent) => {
    const { api } = event;

    // Clear any restored default content, then apply the foundation layout once.
    for (const panel of api.panels) {
      panel.api.close();
    }

    const scene = api.addPanel({
      id: "scene",
      component: "scene",
      title: "Scene",
    });

    api.addPanel({
      id: "hierarchy",
      component: "hierarchy",
      title: "Hierarchy",
      position: { referencePanel: scene, direction: "left" },
      initialWidth: 260,
    });

    api.addPanel({
      id: "inspector",
      component: "inspector",
      title: "Inspector",
      position: { referencePanel: scene, direction: "right" },
      initialWidth: 280,
    });

    api.addPanel({
      id: "assets",
      component: "assets",
      title: "Assets",
      position: { referencePanel: "hierarchy", direction: "below" },
      initialHeight: 220,
    });

    api.addPanel({
      id: "bottom",
      component: "bottom",
      title: "Console / Preview",
      position: { referencePanel: scene, direction: "below" },
      initialHeight: 200,
    });
  };

  return (
    <DockviewReact
      className="dockview-theme-dark editor-dockview"
      components={components}
      onReady={onReady}
    />
  );
}
