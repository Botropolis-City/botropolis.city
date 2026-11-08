import { describe, expect, it } from "vitest";
import { catalog, detail, merge, type Catalog, type Manifest } from "./media.ts";

const entry = (file: string, extra: Record<string, unknown> = {}) => {
  const [scenario, rest] = file.split("/");
  const [shot, format] = rest.split(".");
  const kind = format === "png" ? "image" : format === "gif" ? "animation" : "video";
  return { file, kind, format, scenario, shot, title: `${scenario} ${shot}`, description: `about ${shot}`, width: 1920, height: 1080, ...extra };
};

const manifest: Manifest = {
  generated: "2026-10-10T12:13:03Z",
  version: "0.1.4",
  media: [
    entry("hamlet/hero.png"),
    entry("hamlet/drift.mp4", { seconds: 14, poster: "hamlet/drift.png" }),
    entry("hamlet/drift.webm", { seconds: 14, poster: "hamlet/drift.png" }),
    entry("hamlet/drift.gif", { seconds: 14, poster: "hamlet/drift.png", width: 960, height: 540 }),
  ],
} as Manifest;

const hashOf = (file: string) => `h${file.replace(/\W/g, "")}`;

describe("catalog", () => {
  describe("when given a manifest with one still and one clip in three formats", () => {
    const result = catalog(manifest, hashOf, "https://media.example");
    const clip = result.clips[0];

    it("should carry the manifest's version", () => {
      expect(result.version).toBe("0.1.4");
    });

    it("should list the still once", () => {
      expect(result.stills.map((s) => s.id)).toEqual(["hamlet/hero"]);
    });

    it("should name a still's image by scenario and shot", () => {
      expect(result.stills[0].image).toBe("hamlet-hero");
    });

    it("should fold the formats into one clip", () => {
      expect(result.clips).toHaveLength(1);
    });

    it("should drop the gif", () => {
      expect(clip.sources.map((s) => s.type)).not.toContain("image/gif");
    });

    it("should offer webm before mp4", () => {
      expect(clip.sources.map((s) => s.type)).toEqual(["video/webm", "video/mp4"]);
    });

    it("should address each source by its content hash on the media host", () => {
      expect(clip.sources[1].url).toBe("https://media.example/hhamletdriftmp4.mp4");
    });

    it("should name the clip's poster as an image", () => {
      expect(clip.poster).toBe("hamlet-drift");
    });

    it("should keep the clip's duration", () => {
      expect(clip.seconds).toBe(14);
    });
  });

  describe("when the same manifest is catalogued twice", () => {
    it("should produce identical output", () => {
      expect(JSON.stringify(catalog(manifest, hashOf, "https://m"))).toBe(JSON.stringify(catalog(manifest, hashOf, "https://m")));
    });
  });

  describe("when a clip has only an mp4", () => {
    const only = { ...manifest, media: [entry("workday/morning.mp4", { seconds: 40, poster: "workday/morning.png" })] } as Manifest;

    it("should still be a clip, with one source", () => {
      expect(catalog(only, hashOf, "https://m").clips[0].sources).toHaveLength(1);
    });
  });

  describe("when a clip has no poster", () => {
    const bare = { ...manifest, media: [entry("workday/morning.mp4", { seconds: 40 })] } as Manifest;

    it("should refuse it, naming the clip", () => {
      expect(() => catalog(bare, hashOf, "https://m")).toThrow(/workday\/morning/);
    });
  });
});

// Item 76: the film names the view a still shows, and cuts a phone crop
// of a clip beside it.
describe("catalog, item 76", () => {
  describe("when a still names a view", () => {
    const viewed = { ...manifest, media: [entry("layers/spend.png", { view: "spend" })] } as Manifest;

    it("should carry the view", () => {
      expect(catalog(viewed, hashOf, "https://m").stills[0].view).toBe("spend");
    });
  });

  describe("when a clip has a 4:5 crop", () => {
    const cropped = {
      ...manifest,
      media: [
        entry("metropolis/loop.webm", { seconds: 15, poster: "metropolis/loop.png" }),
        entry("metropolis/loop.mp4", { seconds: 15, poster: "metropolis/loop.png" }),
        entry("metropolis/loop-4x5.webm", { shot: "loop", seconds: 15, poster: "metropolis/loop-4x5.png", crop: "4:5", width: 864 }),
        entry("metropolis/loop-4x5.mp4", { shot: "loop", seconds: 15, poster: "metropolis/loop-4x5.png", crop: "4:5", width: 864 }),
      ],
    } as Manifest;
    const loop = catalog(cropped, hashOf, "https://m").clips[0];

    it("should keep the crop out of the clip's own sources", () => {
      expect(loop.sources.map((s) => s.file)).toEqual(["metropolis/loop.webm", "metropolis/loop.mp4"]);
    });

    it("should list the crop's sources, webm first", () => {
      expect(loop.crops?.["4:5"]?.sources.map((s) => s.file)).toEqual(["metropolis/loop-4x5.webm", "metropolis/loop-4x5.mp4"]);
    });

    it("should give the crop its own poster", () => {
      expect([loop.crops?.["4:5"]?.poster, loop.crops?.["4:5"]?.posterFile]).toEqual(["metropolis-loop-4x5", "metropolis/loop-4x5.png"]);
    });
  });
});

// Item 360: a partial film (item 362's) is merged into the catalog rather
// than replacing it, and each entry says what drew it and what filmed it.
describe("when a partial film is merged into the catalog", () => {
  const base = "https://media.example";
  const film = (version: string, generated: string, media: ReturnType<typeof entry>[]) => ({ version, generated, media }) as Manifest;
  const existing: Catalog = catalog(
    film("0.5.0", "2026-11-07T14:00:00Z", [entry("metropolis/hero.png"), entry("workshop/tour.mp4", { seconds: 26, poster: "workshop/tour.png" }), entry("tidy/close-group.mp4", { seconds: 9, poster: "tidy/close-group.png" })]),
    hashOf,
    base,
    { commit: "b5d2d46e" },
  );
  const partial: Catalog = catalog(
    film("0.5.0", "2026-11-08T00:47:00Z", [entry("metropolis/hero.png", { title: "refilmed" }), entry("groups/kerb.mp4", { seconds: 5, poster: "groups/kerb.png" })]),
    hashOf,
    base,
    { commit: "b5d2d46e", film: "c8cb3e8" },
  );
  const { catalog: merged, stale } = merge(existing, partial);
  const still = (id: string) => merged.stills.find((s) => s.id === id);
  const clip = (id: string) => merged.clips.find((c) => c.id === id);

  describe("and its version differs from the catalog's", () => {
    it("it should refuse, naming both", () => {
      expect(() => merge(existing, { ...partial, version: "0.5.1" })).toThrow(/0\.5\.1.*0\.5\.0/);
    });
  });

  describe("and it names a shot the catalog has", () => {
    it("it should replace that entry", () => {
      expect(still("metropolis/hero")?.title).toBe("refilmed");
    });

    it("it should keep every entry it does not name", () => {
      expect(merged.clips.map((c) => c.id)).toEqual(expect.arrayContaining(["workshop/tour", "tidy/close-group"]));
    });
  });

  describe("and it names a shot the catalog lacks", () => {
    it("it should add it", () => {
      expect(clip("groups/kerb")).toBeDefined();
    });
  });

  describe("and its entries are read", () => {
    it("each merged entry should carry the app commit that drew it and the commit that filmed it", () => {
      expect([still("metropolis/hero")?.filmed, clip("groups/kerb")?.filmed].map((f) => [f?.commit, f?.film])).toEqual([
        ["b5d2d46e", "c8cb3e8"],
        ["b5d2d46e", "c8cb3e8"],
      ]);
    });

    it("each kept entry should keep what it had", () => {
      expect(clip("workshop/tour")?.filmed).toEqual({ commit: "b5d2d46e", generated: "2026-11-07T14:00:00Z" });
    });
  });

  describe("and the catalog's entries say nothing of their commit", () => {
    const unsourced: Catalog = { ...existing, stills: existing.stills.map(({ filmed: _, ...s }) => s), clips: existing.clips.map(({ filmed: _, ...c }) => c) };

    it("it should refuse without one", () => {
      expect(() => merge(unsourced, partial)).toThrow(/commit/);
    });

    it("it should give them the one it is told, with the catalog's generated", () => {
      expect(merge(unsourced, partial, "b5d2d46e").catalog.clips.find((c) => c.id === "workshop/tour")?.filmed).toEqual({ commit: "b5d2d46e", generated: "2026-11-07T14:00:00Z" });
    });
  });

  describe("and a replaced still had an image no other entry uses", () => {
    const renamed: Catalog = { ...partial, stills: partial.stills.map((s) => ({ ...s, image: "metropolis-hero-2" })) };

    it("it should list that image as stale", () => {
      expect(merge(existing, renamed).stale).toEqual(["metropolis-hero"]);
    });
  });

  describe("and nothing it replaces drops an image", () => {
    it("it should list nothing as stale", () => {
      expect(stale).toEqual([]);
    });
  });
});

describe("when a still is given a detail", () => {
  const anchored = catalog(
    { version: "0.5.0", generated: "x", media: [entry("groups/line-districts.png", { anchors: { "district:driftwood": { x: 900, y: 400 }, "district:saltmarsh": { x: 1200, y: 600 } } })] } as Manifest,
    hashOf,
    "https://media.example",
  ).stills[0];
  const box = { x: 560, y: 300, width: 900, height: 520 };

  describe("and its box holds every anchor it names", () => {
    it("it should carry the box and a detail image of its own", () => {
      expect(detail(anchored, { box, holds: ["district:driftwood", "district:saltmarsh"] }).detail).toEqual({ box, holds: ["district:driftwood", "district:saltmarsh"], image: "groups-line-districts-detail" });
    });
  });

  describe("and an anchor it names falls outside its box", () => {
    it("it should refuse, naming the anchor", () => {
      expect(() => detail(anchored, { box: { ...box, width: 400 }, holds: ["district:saltmarsh"] })).toThrow(/district:saltmarsh/);
    });
  });

  describe("and the still lacks an anchor it names", () => {
    it("it should refuse, naming the anchor", () => {
      expect(() => detail(anchored, { box, holds: ["district:kiln"] })).toThrow(/district:kiln/);
    });
  });
});
