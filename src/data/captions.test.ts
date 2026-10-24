import { describe, expect, it } from "vitest";
import media from "./media.json" with { type: "json" };
import { stale } from "./stale.ts";

const captions = [...media.stills, ...media.clips].map((m) => ({ id: m.id, text: `${m.title} ${m.description}` }));

describe("when the imported captions are read", () => {
  for (const phrase of stale) {
    describe(`and it is the sentence 0.3.0 made false, "${phrase}"`, () => {
      it("it should be in none of them", () => {
        expect(captions.filter((c) => c.text.includes(phrase)).map((c) => c.id)).toEqual([]);
      });
    });
  }
});
