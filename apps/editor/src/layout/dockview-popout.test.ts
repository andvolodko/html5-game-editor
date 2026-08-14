import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  DOCKVIEW_POPOUT_PAGE,
  dockPoppedOutPanel,
  dockviewPopoutUrl,
  isCrossWindowDockMove,
  isPopoutGroupLocation,
  type DockablePanelRef,
} from "./dockview-popout";

function fakePanel<TGroup extends object>(
  group: TGroup,
  locationType = "grid",
): DockablePanelRef<TGroup> & {
  moveTo: ReturnType<typeof vi.fn>;
} {
  const moveTo = vi.fn();
  return {
    group,
    api: { moveTo, location: { type: locationType } },
    moveTo,
  };
}

describe("dockviewPopoutUrl", () => {
  it("joins the Vite base with popout.html", () => {
    expect(dockviewPopoutUrl("/")).toBe(`/${DOCKVIEW_POPOUT_PAGE}`);
    expect(dockviewPopoutUrl("/editor/")).toBe(`/editor/${DOCKVIEW_POPOUT_PAGE}`);
    expect(dockviewPopoutUrl("/editor")).toBe(`/editor/${DOCKVIEW_POPOUT_PAGE}`);
  });
});

describe("isPopoutGroupLocation", () => {
  it("detects popout groups only", () => {
    expect(isPopoutGroupLocation({ type: "popout" })).toBe(true);
    expect(isPopoutGroupLocation({ type: "grid" })).toBe(false);
    expect(isPopoutGroupLocation({ type: "floating" })).toBe(false);
  });
});

describe("isCrossWindowDockMove", () => {
  it("is true only when entering or leaving a popout window", () => {
    expect(isCrossWindowDockMove("grid", "popout")).toBe(true);
    expect(isCrossWindowDockMove("popout", "grid")).toBe(true);
    expect(isCrossWindowDockMove("floating", "popout")).toBe(true);
    expect(isCrossWindowDockMove("grid", "floating")).toBe(false);
    expect(isCrossWindowDockMove("grid", "grid")).toBe(false);
  });
});

describe("dockPoppedOutPanel", () => {
  it("tabs beside a companion panel in another group", () => {
    const previewGroup = { id: "preview-group" };
    const consoleGroup = { id: "console-group" };
    const panel = fakePanel(consoleGroup);
    dockPoppedOutPanel(
      panel,
      {
        getPanel(id) {
          return id === "preview" ? fakePanel(previewGroup) : undefined;
        },
      },
      "preview",
    );
    expect(panel.moveTo).toHaveBeenCalledWith({
      group: previewGroup,
      position: "center",
    });
  });

  it("docks to the bottom edge when the companion is missing", () => {
    const panel = fakePanel({ id: "console-group" });
    dockPoppedOutPanel(panel, { getPanel: () => undefined }, "preview");
    expect(panel.moveTo).toHaveBeenCalledWith({ position: "bottom" });
  });

  it("docks to the bottom edge when the companion is already in the same group", () => {
    const shared = { id: "shared" };
    const panel = fakePanel(shared);
    dockPoppedOutPanel(
      panel,
      {
        getPanel(id) {
          return id === "preview" ? fakePanel(shared) : undefined;
        },
      },
      "preview",
    );
    expect(panel.moveTo).toHaveBeenCalledWith({ position: "bottom" });
  });

  it("docks to the bottom edge when the companion is itself popped out", () => {
    const panel = fakePanel({ id: "preview-group" }, "popout");
    dockPoppedOutPanel(
      panel,
      {
        getPanel(id) {
          return id === "console"
            ? fakePanel({ id: "console-group" }, "popout")
            : undefined;
        },
      },
      "console",
    );
    expect(panel.moveTo).toHaveBeenCalledWith({ position: "bottom" });
  });
});

describe("popout.html", () => {
  it("ships a blank same-origin page for dockview windows", () => {
    const html = readFileSync(new URL("../../public/popout.html", import.meta.url), "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<body></body>");
  });
});
