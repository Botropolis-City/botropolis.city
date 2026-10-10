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

test.describe("every package the install tabs download", () => {
  for (const url of distros.flatMap((d) => d.command.match(/https:\/\/github\.com\/\S+/g) ?? [])) {
    test(`${url} should exist`, async ({ request }) => {
      expect((await request.head(url)).status()).toBe(200);
    });
  }
});
