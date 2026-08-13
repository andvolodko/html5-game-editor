import { describe, expect, it } from "vitest";
import {
  STANDALONE_GAMES_SEGMENT,
  normalizePublicBaseUrl,
  standaloneGameBaseUrl,
  standaloneGamesIndexUrl,
} from "./pages-urls.js";

describe("pages URLs", () => {
  it("keeps the site root as a single slash", () => {
    expect(normalizePublicBaseUrl("")).toBe("/");
    expect(normalizePublicBaseUrl("/")).toBe("/");
  });

  it("adds a trailing slash to a repo Pages prefix", () => {
    expect(normalizePublicBaseUrl("/html5-game-editor")).toBe(
      "/html5-game-editor/",
    );
    expect(normalizePublicBaseUrl("/html5-game-editor/")).toBe(
      "/html5-game-editor/",
    );
  });

  it("places each game under /games/<id>/", () => {
    expect(STANDALONE_GAMES_SEGMENT).toBe("games");
    expect(standaloneGameBaseUrl("/", "example-game")).toBe(
      "/games/example-game/",
    );
    expect(
      standaloneGameBaseUrl("/html5-game-editor/", "muonline-game"),
    ).toBe("/html5-game-editor/games/muonline-game/");
    expect(standaloneGamesIndexUrl("/html5-game-editor")).toBe(
      "/html5-game-editor/games/",
    );
  });
});
