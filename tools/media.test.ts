import { describe, expect, it } from "vitest";
import { catalog, type Manifest } from "./media.ts";

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
