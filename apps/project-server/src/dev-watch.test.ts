import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("project-server dev watch", () => {
  it("excludes games/ so scene save does not restart tsx", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { scripts: { dev: string } };
    expect(pkg.scripts.dev).toMatch(/tsx watch/);
    expect(pkg.scripts.dev).toMatch(/--exclude/);
    expect(pkg.scripts.dev).toMatch(/\*\*\/games\/\*\*/);
  });
});
