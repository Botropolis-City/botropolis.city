import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { classify, hotspots, still } from "./glance.ts";

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "pkg/city/kinds.go"));
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);

const titles = hotspots.map((h) => h.title);
const districts = hotspots.filter((h) => h.on === "plate");

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

  it("it should have one for each of the still's districts", () => {
    expect(districts).toHaveLength(still.districts);
  });

  it("it should name each district once", () => {
    expect(new Set(districts.map((d) => d.title)).size).toBe(districts.length);
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
