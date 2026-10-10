import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import media from "../../../src/data/media.json" with { type: "json" };
import { distros } from "../../../src/data/install.ts";

test.describe("when the page loads", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("it should name the project in the heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Botropolis");
  });

  test("it should show the filmed version in the HUD", async ({ page }) => {
    await expect(page.getByTestId("version")).toHaveText(`v${media.version}`);
  });

  test("it should link to the source on GitHub", async ({ page }) => {
    await expect(page.getByRole("link", { name: /github/i }).first()).toHaveAttribute("href", /github\.com\/auroq\/botropolis/);
  });

  test("it should offer a control that pauses the title screen", async ({ page }) => {
    await expect(page.getByRole("button", { name: /pause/i })).toBeVisible();
  });

  test("it should have no accessibility violations", async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });

  test.describe("and the viewport is a phone", () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test("it should not scroll sideways", async ({ page }) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    });
  });

  test.describe("and the reader prefers reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("it should not animate the title screen", async ({ page }) => {
      expect(await page.getByTestId("hero-media").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    });
  });
});

test.describe("the theater's player", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const attr of ["muted", "playsinline"]) {
    test(`it should be ${attr}`, async ({ page }) => {
      expect(await page.getByTestId("player").evaluate((v, a) => v.hasAttribute(a), attr)).toBe(true);
    });
  }
});

test.describe("when a scene is chosen", () => {
  for (const clip of media.clips) {
    test.describe(`and it is ${clip.id}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.getByTestId(`scene-${clip.scenario}`).click();
      });

      test("it should load that clip into the player", async ({ page }) => {
        await expect(page.getByTestId("player").locator("source").first()).toHaveAttribute("src", clip.sources[0].url);
      });

      test("it should caption the player with the clip's description", async ({ page }) => {
        await expect(page.getByTestId("caption")).toContainText(clip.description);
      });

      test("it should title the window with the scenario", async ({ page }) => {
        await expect(page.getByTestId("window-title")).toContainText(clip.scenario);
      });
    });
  }
});

test.describe("when ? is pressed", () => {
  test("it should open the list of keys", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: /keys/i })).toBeVisible();
  });
});

test.describe("when v is pressed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("it should advance the view", async ({ page }) => {
    const before = await page.getByTestId("view-current").textContent();
    await page.keyboard.press("v");
    await expect(page.getByTestId("view-current")).not.toHaveText(before ?? "");
  });

  test.describe("and shortcuts are switched off", () => {
    test("it should leave the view alone", async ({ page }) => {
      await page.keyboard.press("?");
      await page.getByRole("checkbox", { name: /shortcuts/i }).uncheck();
      await page.keyboard.press("Escape");
      const before = await page.getByTestId("view-current").textContent();
      await page.keyboard.press("v");
      await expect(page.getByTestId("view-current")).toHaveText(before ?? "");
    });
  });
});

test.describe("when an install tab is chosen", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  for (const d of distros) {
    test.describe(`and it is ${d.label}`, () => {
      test("its copy button should copy its command", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("tab", { name: d.label }).click();
        await page.getByRole("tabpanel").getByRole("button", { name: /copy/i }).click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(d.command);
      });
    });
  }
});
