import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { versionsIn } from "./latest.ts";

const allowed = new Set(["src/data/release.ts", "src/data/media.json"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

const sources = walk("src").filter((f) => /\.(astro|ts|css|js|mjs|json|md)$/.test(f) && !f.endsWith(".test.ts") && !allowed.has(f));

describe("when version numbers are searched for", () => {
  describe("and it is prose naming some", () => {
    it("it should find each", () => {
      expect(versionsIn("New in 0.3.1, and 0.3.x continues on them; v1.0.0 keeps")).toEqual(["0.3.1", "0.3.x", "1.0.0"]);
    });
  });

  describe("and it is an SVG path's data", () => {
    it("it should find none", () => {
      expect(versionsIn('<path\n d="M8 0C3.58 0 7.59.4 2.01.37" />')).toEqual([]);
    });
  });

  describe("and it is a measurement", () => {
    it("it should find none", () => {
      expect(versionsIn("about 10–11 ms and 4.6 GiB")).toEqual([]);
    });
  });
});

describe("when the source is searched for version numbers", () => {
  it("it should have files to search", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  for (const file of sources) {
    describe(`and it is ${file}`, () => {
      it("it should name none outside release.ts and media.json", () => {
        expect(versionsIn(readFileSync(file, "utf8"))).toEqual([]);
      });
    });
  }
});
