import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Editor } from "@game-editor/editor-core";
import { createEditor } from "./create-editor";

function readSibling(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

describe("createEditor (live)", () => {
  it("constructs an Editor without loading demo JSON globs", () => {
    expect(createEditor()).toBeInstanceOf(Editor);
  });

  it("keeps eager games JSON globs out of the live module graph", () => {
    const factory = readSibling("./create-editor.ts");
    const app = readSibling("./App.tsx");
    for (const source of [factory, app]) {
      expect(source).not.toContain("load-demo-snapshot");
      expect(source).not.toContain("create-demo-clients");
      expect(source).not.toContain("import.meta.glob");
    }
  });
});

describe("live Vite watch", () => {
  it("ignores game JSON written by Ctrl+S", () => {
    const viteConfig = readFileSync(
      new URL("../vite.config.ts", import.meta.url),
      "utf8",
    );
    expect(viteConfig).toContain("**/games/**/project.json");
    expect(viteConfig).toContain("**/games/**/.project/**");
    expect(viteConfig).toContain("**/games/**/assets/**");
    expect(viteConfig).toContain("create-demo-editor.ts");
  });
});
