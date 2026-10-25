import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { classify, hotspots, place, still, type Spec } from "./glance.ts";

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "pkg/city/kinds.go"));
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);

const titles = hotspots.map((h) => h.title);
const districts = hotspots.filter((h) => h.on === "plate");

// Item 76: the film says where the plant, the towers, the library, the
// depot and each district landed in the still, so a refilm moves their
// hotspots with them. Item 231's checks below hold either way.
describe("when the hotspots are placed", () => {
  const spec = (title: string, extra: Partial<Spec> = {}): Spec => ({
    title, line: title, source: "pkg/city/kinds.go", on: "object", px: 960, py: 540, tone: "var(--dim)", ...extra,
  });
  const plant = spec("power plant", { anchor: { name: "plant", dx: -4, dy: -34 } });
  const road = spec("road", { px: 1330, py: 545 });

  describe("and a hotspot names an anchor the still has", () => {
    it("it should stand at the anchor, nudged by its own offset", () => {
      const [h] = place([plant], { plant: { x: 1000, y: 500 } });
      expect([h.x, h.y]).toEqual([Math.round((996 / still.width) * 10000) / 100, Math.round((466 / still.height) * 10000) / 100]);
    });
  });

  describe("and the still has anchors, but not the one a hotspot names", () => {
    it("it should refuse, naming it", () => {
      expect(() => place([plant], { "tower:tracker": { x: 1, y: 1 } })).toThrow(/power plant.*plant/);
    });
  });

  describe("and the still has no anchors", () => {
    it("it should stand every hotspot where it was placed by hand", () => {
      expect(place([plant, road]).map((h) => [h.x, h.y])).toEqual(place([spec("a"), road]).map((h) => [h.x, h.y]));
    });
  });

  describe("and a hotspot names no anchor", () => {
    it("it should stand where it was placed by hand, whatever the still has", () => {
      expect(place([road], { plant: { x: 1, y: 1 } })).toEqual(place([road]));
    });
  });
});

describe("when a pixel is classified", () => {
  const cases: [string, [number, number, number], string][] = [
    ["a district plate", [193, 192, 183], "plate"],
    ["the plaza", [179, 178, 181], "plaza"],
    ["grass", [130, 155, 110], "grass"],
    ["the sea", [78, 138, 186], "water"],
    ["the river", [111, 167, 208], "water"],
    ["a water tower's tank", [103, 150, 176], "object"],
    ["a building's wall", [97, 81, 66], "object"],
  ];
  for (const [what, rgb, expected] of cases) {
    describe(`and it is ${what}`, () => {
      it(`it should read as ${expected}`, () => {
        expect(classify(rgb)).toBe(expected);
      });
    });
  }
});

describe("when the hotspots are read", () => {
  it("it should not label the fountain", () => {
    expect(titles).not.toContain("fountain");
  });

  for (const object of ["library", "power plant", "working", "resting", "unattended", "road", "trains"]) {
    describe(`and it is the ${object}`, () => {
      it("it should have one", () => {
        expect(titles).toContain(object);
      });
    });
  }

  describe("and it is a district", () => {
    it("it should have exactly one district hotspot", () => {
      expect(districts).toHaveLength(1);
    });

    it("its line should say a district is a directory, in the app's words", () => {
      expect(districts[0]?.line).toContain("Each district is a project: a directory");
    });
  });

  let pixels: Buffer;
  let width = 0;
  let height = 0;
  beforeAll(async () => {
    const { data, info } = await sharp(still.file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    pixels = data;
    width = info.width;
    height = info.height;
  });
  const at = (x: number, y: number): [number, number, number] => {
    const i = (Math.round((y / 100) * (height - 1)) * width + Math.round((x / 100) * (width - 1))) * 3;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };

  for (const h of hotspots) {
    describe(`and it is ${h.title}`, () => {
      it("its line should contain its quote", () => {
        expect(h.line).toContain(h.quote);
      });

      liveIt(liveName(`its quote should be in the app's ${h.source}`), () => {
        expect(readFileSync(join(botropolis, h.source), "utf8")).toContain(h.quote);
      });

      it(`it should sit on ${h.on === "object" ? "an object" : h.on} in the still`, () => {
        expect(classify(at(h.x, h.y))).toBe(h.on);
      });
    });
  }
});
