import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { numbers, release, section } from "./release.ts";

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const changelogPath = join(botropolis, "CHANGELOG.md");
const live = existsSync(changelogPath);
const changelog = live ? section(readFileSync(changelogPath, "utf8"), release.version) : "";
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);

describe("when the changelog's section for a version is read", () => {
  const text = "## [0.4.0] - x\n\nlater\n\n## [0.3.0] - 2026-10-23\n\nthis one\n\n## [0.2.3] - y\n\nearlier\n";

  it("it should hold only that version's lines", () => {
    expect(section(text, "0.3.0").trim()).toBe("## [0.3.0] - 2026-10-23\n\nthis one");
  });
});

describe("when the numbers in a sentence are read", () => {
  it("it should find whole, decimal and ranged numbers", () => {
    expect(numbers("about 10–11 ms, 4.6 GiB, 1080p and 1,000")).toEqual(["10", "11", "4.6", "1080", "1,000"]);
  });
});

describe("when the release's figures are read", () => {
  it("it should have some", () => {
    expect(release.figures.length).toBeGreaterThan(0);
  });

  for (const f of release.figures) {
    describe(`and it is ${f.label}`, () => {
      it("it should use only numbers its changelog quote contains", () => {
        expect(numbers(`${f.label} ${f.before} ${f.after}`).filter((n) => !numbers(f.quote).includes(n))).toEqual([]);
      });

      liveIt(liveName("it should quote a line from botropolis's changelog for its release"), () => {
        expect(changelog).toContain(f.quote);
      });
    });
  }
});

describe("when the machine they were measured on is read", () => {
  liveIt(liveName("it should quote the changelog"), () => {
    expect(changelog).toContain(release.measuredOn);
  });
});

describe("when the budgets it misses are read", () => {
  it("it should name the two the changelog names", () => {
    expect(release.misses).toHaveLength(2);
  });

  for (const m of release.misses) {
    describe(`and it is ${m.text}`, () => {
      it("it should use only numbers its changelog quote contains", () => {
        expect(numbers(m.text).filter((n) => !numbers(m.quote).includes(n))).toEqual([]);
      });

      liveIt(liveName("it should quote the changelog"), () => {
        expect(changelog).toContain(m.quote);
      });
    });
  }
});
