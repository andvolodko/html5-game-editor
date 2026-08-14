import { useEffect, useState } from "react";
import type { IDockviewHeaderActionsProps } from "dockview";
import { EDITOR_PANEL_IDS } from "../settings/editor-settings-storage";
import { dockPoppedOutPanel, isPopoutGroupLocation } from "./dockview-popout";

const POPOUT_PANEL_LABELS: Record<string, string> = {
  [EDITOR_PANEL_IDS.console]: "Console",
  [EDITOR_PANEL_IDS.preview]: "Preview",
};

const POPOUT_COMPANION_IDS: Record<string, string> = {
  [EDITOR_PANEL_IDS.console]: EDITOR_PANEL_IDS.preview,
  [EDITOR_PANEL_IDS.preview]: EDITOR_PANEL_IDS.console,
};

export function PopoutHeaderActions({
  activePanel,
  api,
  containerApi,
  panels,
}: IDockviewHeaderActionsProps) {
  const activeId = activePanel?.id;
  const panel = activeId
    ? panels.find((candidate) => candidate.id === activeId)
    : undefined;
  const label = activeId ? POPOUT_PANEL_LABELS[activeId] : undefined;
  const companionId = activeId ? POPOUT_COMPANION_IDS[activeId] : undefined;
  const [locationType, setLocationType] = useState(api.location.type);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLocationType(api.location.type);
    const disposable = api.onDidLocationChange((event) => {
      setLocationType(event.location.type);
    });
    return () => {
      disposable.dispose();
    };
  }, [api]);

  if (!panel || !label || !companionId) {
    return null;
  }

  const poppedOut = isPopoutGroupLocation({ type: locationType });

  const handleClick = () => {
    if (pending) {
      return;
    }
    if (poppedOut) {
      dockPoppedOutPanel(panel, containerApi, companionId);
      return;
    }
    setPending(true);
    void containerApi.addPopoutGroup(panel).finally(() => {
      setPending(false);
    });
  };

  return (
    <button
      type="button"
      className="dock-header-action"
      disabled={pending}
      title={
        poppedOut
          ? `Dock ${label} back into the editor`
          : `Open ${label} in a separate window`
      }
      aria-label={poppedOut ? `Dock ${label}` : `Pop out ${label}`}
      onClick={handleClick}
    >
      {poppedOut ? "Dock" : "Pop out"}
    </button>
  );
}
