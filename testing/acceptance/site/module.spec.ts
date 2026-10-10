import { expect, test } from "@playwright/test";
import { modulePath, packages, repo } from "../../../src/data/module.ts";

test.describe("when the go command resolves the module", () => {
  for (const p of packages) {
    const path = p ? `/botropolis/${p}` : "/botropolis";

    test(`${path}?go-get=1 should name the repository`, async ({ request }) => {
      const body = await (await request.get(`${path}?go-get=1`)).text();
      expect(body).toContain(`<meta name="go-import" content="${modulePath} git ${repo}.git">`);
    });
  }
});
