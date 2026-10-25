import { describe, expect, it } from "vitest";
import type { Catalog, Clip, Still } from "../../tools/media.ts";
import { heroMedia, phoneQuery, socialCard } from "./hero.ts";

const source = (file: string) => {
  const format = file.split(".").pop()!;
  return { type: `video/${format}`, url: `https://m/${file}`, file, name: file.replace(/\W/g, "") };
};

const loop: Clip = {
  id: "metropolis/loop",
  scenario: "metropolis",
  shot: "loop",
  title: "The metropolis, drifting",
  description: "A slow drift.",
  width: 1920,
  height: 1080,
  seconds: 15,
  poster: "metropolis-loop",
  posterFile: "metropolis/loop.png",
  sources: [source("metropolis/loop.webm"), source("metropolis/loop.mp4")],
  crops: {
    "4:5": {
      width: 864,
      height: 1080,
      poster: "metropolis-loop-4x5",
      posterFile: "metropolis/loop-4x5.png",
      sources: [source("metropolis/loop-4x5.webm"), source("metropolis/loop-4x5.mp4")],
    },
  },
};

const still = (shot: string, width = 1920, height = 1080): Still => ({
  id: `metropolis/${shot}`, scenario: "metropolis", shot, title: shot, description: shot, width, height, image: `metropolis-${shot}`,
});

const catalogOf = (stills: Still[], clips: Clip[]): Catalog => ({ version: "0.4.0", generated: "2026-10-25T00:00:00Z", stills, clips });

// Item 76: the hero and the link preview each have a stand-in until the
// release films what they were waiting for.
describe("heroMedia", () => {
  describe("when the catalog has the metropolis loop", () => {
    const hero = heroMedia(catalogOf([still("hero")], [loop]));

    it("should play the loop", () => {
      expect(hero.kind).toBe("loop");
    });

    it("should offer the phone crop first, for narrow screens, then the loop, webm before mp4", () => {
      expect(hero.kind === "loop" && hero.sources.map((s) => [s.media, s.file])).toEqual([
        [phoneQuery, "metropolis/loop-4x5.webm"],
        [phoneQuery, "metropolis/loop-4x5.mp4"],
        [undefined, "metropolis/loop.webm"],
        [undefined, "metropolis/loop.mp4"],
      ]);
    });

    it("should show the loop's poster until it plays", () => {
      expect(hero.kind === "loop" && hero.poster).toBe("metropolis-loop");
    });
  });

  describe("when the catalog has no loop", () => {
    it("should show the metropolis hero still, drifting, as today", () => {
      expect(heroMedia(catalogOf([still("hero")], []))).toEqual({ kind: "still", image: "metropolis-hero" });
    });
  });
});

describe("socialCard", () => {
  describe("when the catalog has the metropolis card", () => {
    it("should use it as filmed, at 1200x630", () => {
      expect(socialCard(catalogOf([still("hero"), still("card", 1200, 630)], []))).toEqual({ image: "metropolis-card", crop: false });
    });
  });

  describe("when it has none", () => {
    it("should crop the metropolis hero still to 1200x630, as today", () => {
      expect(socialCard(catalogOf([still("hero")], []))).toEqual({ image: "metropolis-hero", crop: true });
    });
  });

  describe("when the card was filmed at another size", () => {
    it("should refuse it, naming the size", () => {
      expect(() => socialCard(catalogOf([still("card", 1920, 1080)], []))).toThrow(/1920x1080/);
    });
  });
});
