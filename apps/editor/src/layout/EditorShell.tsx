import { Toolbar } from "../panels/Toolbar";
import { DockLayout } from "./DockLayout";

export function EditorShell() {
  return (
    <div className="editor-shell">
      <Toolbar />
      <div className="editor-dock-host">
        <DockLayout />
      </div>
    </div>
  );
}
