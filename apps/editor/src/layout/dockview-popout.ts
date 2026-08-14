export const DOCKVIEW_POPOUT_PAGE = "popout.html";

export function dockviewPopoutUrl(baseUrl: string): string {
  const trimmed = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${trimmed}${DOCKVIEW_POPOUT_PAGE}`;
}

export function isPopoutGroupLocation(location: { type: string }): boolean {
  return location.type === "popout";
}

/** True when a group moves between the editor window and a popout window. */
export function isCrossWindowDockMove(fromType: string, toType: string): boolean {
  return (
    isPopoutGroupLocation({ type: fromType }) !==
    isPopoutGroupLocation({ type: toType })
  );
}

export interface DockablePanelRef<TGroup extends object = object> {
  readonly group: TGroup;
  readonly api: {
    readonly location?: { type: string };
    moveTo(options: { group?: TGroup; position: "center" | "bottom" }): void;
  };
}

export interface DockPanelLookup<TGroup extends object = object> {
  getPanel(id: string): DockablePanelRef<TGroup> | undefined;
}

/**
 * Return a popped-out panel to the grid: tab it with `companionPanelId` when
 * that panel still exists in the editor window, otherwise dock along the bottom
 * edge.
 */
export function dockPoppedOutPanel<TGroup extends object>(
  panel: DockablePanelRef<TGroup>,
  container: DockPanelLookup<TGroup>,
  companionPanelId: string,
): void {
  const companion = container.getPanel(companionPanelId);
  const companionInEditorWindow =
    companion &&
    companion.group !== panel.group &&
    !isPopoutGroupLocation(companion.api.location ?? { type: "grid" });
  if (companionInEditorWindow) {
    panel.api.moveTo({ group: companion.group, position: "center" });
    return;
  }
  panel.api.moveTo({ position: "bottom" });
}
