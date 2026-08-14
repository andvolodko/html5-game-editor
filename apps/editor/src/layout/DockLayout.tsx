import { useEffect, useRef } from "react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { Toolbar } from "../panels/Toolbar";
import { HierarchyPanel } from "../panels/HierarchyPanel";
import { ScenePanel } from "../panels/ScenePanel";
import { AssetsPanel } from "../panels/AssetsPanel";
import { InspectorPanel } from "../panels/InspectorPanel";
import { ProjectSettingsPanel } from "../panels/ProjectSettingsPanel";
import { ConsolePanel } from "../panels/ConsolePanel";
import { PreviewPanel } from "../panels/PreviewPanel";
import { AssetPreviewPanel } from "../panels/AssetPreviewPanel";
import { AssetPreviewSelectionProvider } from "../assets/asset-preview-selection";
import {
  createLocalStorageEditorSettings,
  EDITOR_LAYOUT_VERSION,
  type EditorSettingsStorage,
} from "../settings/editor-settings-storage";
import { applyDefaultEditorLayout } from "./default-layout";
import { PopoutHeaderActions } from "./PopoutHeaderActions";
import { dockviewPopoutUrl } from "./dockview-popout";
import { EditorLayoutContext } from "./layout-context";

const EDITOR_POPOUT_URL = dockviewPopoutUrl(import.meta.env.BASE_URL);

const components = {
  hierarchy: () => <HierarchyPanel />,
  scene: () => <ScenePanel />,
  assets: () => <AssetsPanel />,
  inspector: () => <InspectorPanel />,
  projectSettings: () => <ProjectSettingsPanel />,
  assetPreview: () => <AssetPreviewPanel />,
  console: () => <ConsolePanel />,
  preview: (props: IDockviewPanelProps) => <PreviewPanel {...props} />,
};

const LAYOUT_SAVE_DEBOUNCE_MS = 300;

export function DockLayout({
  settings = createLocalStorageEditorSettings(),
}: {
  settings?: EditorSettingsStorage;
}) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutDisposableRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      layoutDisposableRef.current?.dispose();
      layoutDisposableRef.current = null;
    };
  }, []);

  const persistLayout = (api: DockviewApi) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      settings.saveLayout({
        version: EDITOR_LAYOUT_VERSION,
        data: api.toJSON(),
      });
    }, LAYOUT_SAVE_DEBOUNCE_MS);
  };

  const resetLayout = () => {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    settings.clearLayout();
    applyDefaultEditorLayout(api);
    settings.saveLayout({
      version: EDITOR_LAYOUT_VERSION,
      data: api.toJSON(),
    });
  };

  const onReady = (event: DockviewReadyEvent) => {
    const { api } = event;
    apiRef.current = api;

    const persisted = settings.loadLayout();
    let restored = false;
    if (persisted) {
      try {
        api.fromJSON(persisted.data as Parameters<DockviewApi["fromJSON"]>[0]);
        restored = api.panels.length > 0;
      } catch {
        restored = false;
      }
    }

    if (!restored) {
      applyDefaultEditorLayout(api);
    }

    layoutDisposableRef.current?.dispose();
    layoutDisposableRef.current = api.onDidLayoutChange(() => {
      persistLayout(api);
    });
  };

  return (
    <EditorLayoutContext.Provider value={{ resetLayout }}>
      <AssetPreviewSelectionProvider>
        <div className="editor-shell">
          <Toolbar />
          <div className="editor-dock-host">
            <DockviewReact
              className="dockview-theme-dark editor-dockview"
              components={components}
              popoutUrl={EDITOR_POPOUT_URL}
              rightHeaderActionsComponent={PopoutHeaderActions}
              onReady={onReady}
            />
          </div>
        </div>
      </AssetPreviewSelectionProvider>
    </EditorLayoutContext.Provider>
  );
}
