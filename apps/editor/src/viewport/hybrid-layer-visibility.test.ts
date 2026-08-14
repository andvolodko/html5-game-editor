import { describe, expect, it, vi } from "vitest";
import {
  applyHybridInputLayer,
  applyHybridLayerVisibility,
  pickVisibleHybridNodeId,
  resolveHybridInputLayer,
} from "./hybrid-layer-visibility";

function fakeHost(): HTMLElement {
  return { style: {} } as HTMLElement;
}

function fakeHosts() {
  return {
    bgHost: fakeHost(),
    midHost: fakeHost(),
    fgHost: fakeHost(),
    inputHost: fakeHost(),
  };
}

describe("resolveHybridInputLayer", () => {
  it("keeps the requested layer when it is visible", () => {
    expect(
      resolveHybridInputLayer("foreground", { pixi: true, three: true }),
    ).toBe("foreground");
    expect(
      resolveHybridInputLayer("three", { pixi: true, three: true }),
    ).toBe("three");
  });

  it("falls back to 3D when Pixi is hidden", () => {
    expect(
      resolveHybridInputLayer("background", { pixi: false, three: true }),
    ).toBe("three");
  });

  it("falls back to Pixi background when 3D is hidden", () => {
    expect(
      resolveHybridInputLayer("three", { pixi: true, three: false }),
    ).toBe("background");
  });

  it("returns undefined when every layer is hidden", () => {
    expect(
      resolveHybridInputLayer("three", { pixi: false, three: false }),
    ).toBeUndefined();
  });
});

describe("applyHybridLayerVisibility", () => {
  it("hides Pixi hosts without hiding the 3D host", () => {
    const hosts = fakeHosts();
    applyHybridLayerVisibility(hosts, { pixi: false, three: true });
    expect(hosts.bgHost.style.visibility).toBe("hidden");
    expect(hosts.fgHost.style.visibility).toBe("hidden");
    expect(hosts.midHost.style.visibility).toBe("visible");
  });

  it("hides the 3D host without hiding Pixi hosts", () => {
    const hosts = fakeHosts();
    applyHybridLayerVisibility(hosts, { pixi: true, three: false });
    expect(hosts.bgHost.style.visibility).toBe("visible");
    expect(hosts.fgHost.style.visibility).toBe("visible");
    expect(hosts.midHost.style.visibility).toBe("hidden");
  });
});

describe("applyHybridInputLayer", () => {
  it("does not enable pointer events on a hidden Pixi layer", () => {
    const hosts = fakeHosts();
    applyHybridInputLayer(hosts, "foreground", { pixi: false, three: true });
    expect(hosts.fgHost.style.pointerEvents).toBe("none");
    expect(hosts.midHost.style.pointerEvents).toBe("auto");
  });
});

describe("pickVisibleHybridNodeId", () => {
  it("skips Pixi picks when the Pixi layers are hidden", () => {
    const pickForeground = vi.fn(() => "pixi-fg");
    const pickThree = vi.fn(() => "three");
    const pickBackground = vi.fn(() => "pixi-bg");
    expect(
      pickVisibleHybridNodeId(
        { pixi: false, three: true },
        { pickForeground, pickThree, pickBackground },
      ),
    ).toBe("three");
    expect(pickForeground).not.toHaveBeenCalled();
    expect(pickBackground).not.toHaveBeenCalled();
  });

  it("skips the 3D pick when the 3D layer is hidden", () => {
    const pickForeground = vi.fn(() => undefined);
    const pickThree = vi.fn(() => "three");
    const pickBackground = vi.fn(() => "pixi-bg");
    expect(
      pickVisibleHybridNodeId(
        { pixi: true, three: false },
        { pickForeground, pickThree, pickBackground },
      ),
    ).toBe("pixi-bg");
    expect(pickThree).not.toHaveBeenCalled();
  });

  it("returns undefined when every layer is hidden", () => {
    expect(
      pickVisibleHybridNodeId(
        { pixi: false, three: false },
        {
          pickForeground: () => "pixi-fg",
          pickThree: () => "three",
          pickBackground: () => "pixi-bg",
        },
      ),
    ).toBeUndefined();
  });
});
