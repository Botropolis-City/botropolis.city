import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { media } from "./catalog.ts";
import { cards, facts } from "./groups.ts";

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

  const cardOf = (fact: string) => cards.find((c) => c.facts.includes(fact));
  const shows: [string, string | undefined][] = [
    ["what", undefined],
    ["how", "metropolis/overview"],
    ["kerb", "groups/kerb"],
    ["point", "groups/lit"],
    ["teammate", "team/team-line"],
    ["one", undefined],
    ["board", "controls/board-rename"],
    ["move", undefined],
    ["drop", undefined],
    ["close", "groups/close-group"],
    ["tidy", "tidy/walk"],
  ];

  describe("and its cards are read", () => {
    it("it should give every fact a card", () => {
      expect(facts.filter((f) => !cardOf(f.id)).map((f) => f.id)).toEqual([]);
    });

    for (const [fact, media] of shows) {
      describe(`and it is the ${fact} card`, () => {
        it(`it should show ${media ?? "nothing"}`, () => {
          expect(cardOf(fact)?.media).toBe(media);
        });

        if (media) {
          it("its media should be in the film", () => {
            expect(filmed).toContain(media);
          });
        }
      });
    }

    describe("and it is the board card", () => {
      it("its poster should be the board still", () => {
        expect(cardOf("board")?.poster).toBe("controls/board");
      });
    });

    describe("and it is the line card", () => {
      const forms = cardOf("line")?.forms ?? [];

      liveIt(liveName("it should offer group_line_form's values in the app's order, the default first"), () => {
        const docs = readFileSync(join(botropolis, "pkg/config/docs.go"), "utf8");
        const names = forms.map((f) => f.value);
        expect(docs).toContain(`KeyGroupLineForm:  "${names.slice(0, -1).join(", ")} or ${names.at(-1)}:`);
      });

      for (const form of forms) {
        describe(`and it is the ${form.value} form`, () => {
          const s = media.stills.find((x) => x.id === form.media);

          it("its still should have a detail", () => {
            expect(s?.detail).toBeDefined();
          });

          it("its detail should hold the group's districts", () => {
            const box = s?.detail?.box;
            const outside = (s?.detail?.holds ?? ["(none)"]).filter((n) => {
              const a = s?.anchors?.[n];
              return !a || !box || a.x < box.x || a.x > box.x + box.width || a.y < box.y || a.y > box.y + box.height;
            });
            expect(outside).toEqual([]);
          });
        });
      }
    });
  });
});
