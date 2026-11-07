import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { media } from "./catalog.ts";
import { facts, rows } from "./groups.ts";

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "CHANGELOG.md"));
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);

const ids = ["what", "how", "neighbourhood", "kerb", "line", "form", "board", "move", "drop", "close", "teammate", "one", "point", "tidy", "quiet"];
const filmed = [...media.stills, ...media.clips].map((m) => m.id);

// Item 360: groups shipped across 0.3.2 to 0.5.0 and the site never named
// them, so the section says what each release made of them, in its words.
describe("when the groups section is read", () => {
  it("it should not say what the line used to be, \"not to dots\"", () => {
    expect(facts.filter((f) => f.line.includes("not to dots")).map((f) => f.id)).toEqual([]);
  });

  for (const id of ["what", "kerb"]) {
    describe(`and it is the ${id} fact`, () => {
      it("it should quote the app's kinds.go, not the changelog", () => {
        expect(facts.find((f) => f.id === id)?.source).toBe("pkg/city/kinds.go");
      });
    });
  }

  for (const id of ["teammate", "one"]) {
    describe(`and it is the ${id} fact`, () => {
      it("it should not open on the changelog's \"Now\"", () => {
        expect(facts.find((f) => f.id === id)?.line.startsWith("Now")).toBe(false);
      });
    });
  }

  describe("and it is the close fact", () => {
    it("it should speak of a group, not this one", () => {
      expect(facts.find((f) => f.id === "close")?.line).toContain("Packs every session in a group");
    });
  });

  for (const id of ids) {
    describe(`and it is the ${id} fact`, () => {
      const fact = facts.find((f) => f.id === id);

      it("it should have it", () => {
        expect(fact).toBeDefined();
      });

      it("its line should contain its quote", () => {
        expect(fact?.line).toContain(fact?.quote);
      });

      liveIt(liveName(`its quote should be in the app's ${fact?.source}`), () => {
        expect(readFileSync(join(botropolis, fact?.source ?? ""), "utf8")).toContain(fact?.quote);
      });
    });
  }

  for (const id of ["metropolis/overview", "team/team-line", "tidy/walk"]) {
    describe(`and it is the ${id} media`, () => {
      it("it should be shown", () => {
        expect(rows.map((r) => r.media)).toContain(id);
      });

      it("it should be in the film", () => {
        expect(filmed).toContain(id);
      });
    });
  }
});
