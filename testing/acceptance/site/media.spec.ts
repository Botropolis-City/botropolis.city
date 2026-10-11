import { expect, test } from "@playwright/test";
import media from "../../../src/data/media.json" with { type: "json" };
import { distros } from "../../../src/data/install.ts";

const why = (h: Record<string, string>) =>
  ["server", "cf-mitigated", "cf-ray", "content-type"].map((k) => `${k}=${h[k] ?? "-"}`).join(" ");

test.describe("every uploaded clip", () => {
  for (const s of media.clips.flatMap((c) => c.sources)) {
    test(`${s.file} should be served from ${s.url}`, async ({ request }) => {
      const res = await request.head(s.url);
      expect(res.status(), why(res.headers())).toBe(200);
    });
  }
});

test.describe("every file the install tabs download", () => {
  for (const url of distros.flatMap((d) => `${d.command} ${d.note}`.match(/https:\/\/(github\.com|pkg\.botropolis\.city)\/[^\s)]+/g) ?? [])) {
    test(`${url} should exist`, async ({ request }) => {
      expect((await request.head(url)).status()).toBe(200);
    });
  }
});

test.describe("every download the install tabs give", () => {
  test("there should be some to check", () => {
    expect(distros.some((d) => /https:\/\/github\.com\//.test(`${d.command} ${d.note}`))).toBe(true);
  });

  for (const url of distros.flatMap((d) => `${d.command} ${d.note}`.match(/https:\/\/github\.com\/[^\s)]+/g) ?? [])) {
    test(`${url} should follow the latest release, not name a version`, async () => {
      expect(url).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/latest\/download\/(?!.*\d+\.\d+\.\d+)[^/]+$/);
    });
  }
});
