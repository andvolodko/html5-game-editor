import { describe, expect, it } from "vitest";
import { createScriptComponent } from "./factories/script.js";
import { isScriptEnabled, setScriptEnabledField } from "./script-enabled.js";

describe("script enabled", () => {
  it("treats omitted enabled as true", () => {
    const component = createScriptComponent("example.Spin");
    expect(isScriptEnabled(component)).toBe(true);
    expect(component.enabled).toBeUndefined();
  });

  it("omits the field when setting true and stores false when disabled", () => {
    const component = createScriptComponent("example.Spin", {}, { enabled: false });
    expect(component.enabled).toBe(false);
    expect(isScriptEnabled(component)).toBe(false);
    setScriptEnabledField(component, true);
    expect(component.enabled).toBeUndefined();
    expect(isScriptEnabled(component)).toBe(true);
    setScriptEnabledField(component, false);
    expect(component.enabled).toBe(false);
  });
});
