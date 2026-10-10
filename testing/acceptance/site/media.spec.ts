import { expect, test } from "@playwright/test";
import media from "../../../src/data/media.json" with { type: "json" };

test.describe("every uploaded clip", () => {
  for (const s of media.clips.flatMap((c) => c.sources)) {
    test(`${s.file} should be served from ${s.url}`, async ({ request }) => {
      expect((await request.head(s.url)).status()).toBe(200);
    });
  }
});
