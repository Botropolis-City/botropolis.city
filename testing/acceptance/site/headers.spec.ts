import { expect, test } from "@playwright/test";

test.describe("when the page is served", () => {
  test("its CSP should allow video from the media host", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["content-security-policy"]).toMatch(/media-src[^;]*https:\/\/media\.botropolis\.city/);
  });
});
