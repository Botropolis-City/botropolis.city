import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import media from "../../../src/data/media.json" with { type: "json" };
import { distros, shells } from "../../../src/data/install.ts";
import { theater } from "../../../src/data/theater.ts";

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
    await expect(page.getByRole("link", { name: /github/i }).first()).toHaveAttribute("href", /github\.com\/Botropolis-City\/botropolis/);
  });

  test("it should offer a control that pauses the title screen", async ({ page }) => {
    await expect(page.getByRole("button", { name: /pause/i })).toBeVisible();
  });

  test("it should have no accessibility violations", async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });

  test.describe("and the reader reaches the footer", () => {
    const credit = (page: Page) => page.getByTestId("credits");

    test("it should link Kenney to kenney.nl", async ({ page }) => {
      await expect(credit(page).getByRole("link", { name: "Kenney", exact: true })).toHaveAttribute("href", "https://kenney.nl");
    });

    test("it should link to Kenney's donation page", async ({ page }) => {
      await expect(credit(page).locator('a[href="https://kenney.nl/donate"]')).toHaveCount(1);
    });

    test("it should not show any image in the credit", async ({ page }) => {
      expect(await credit(page).evaluate((el) => el.querySelectorAll("img, svg, picture").length)).toBe(0);
    });

    test("it should name the typefaces", async ({ page }) => {
      await expect(credit(page)).toContainText("Set in Inter by The Inter Project Authors and JetBrains Mono by The JetBrains Mono Project Authors (SIL OFL 1.1).");
    });
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

  test.describe("when it is inline", () => {
    for (const width of [390, 768, 1280, 1920]) {
      test.describe(`and the viewport is ${width} wide`, () => {
        test.use({ viewport: { width, height: 900 } });

        test("it should show the whole frame", async ({ page }) => {
          expect(await page.getByTestId("player").evaluate((v) => getComputedStyle(v).objectFit)).toBe("contain");
        });

        test("it should keep the window's 16:9 shape", async ({ page }) => {
          const box = (await page.getByTestId("player").boundingBox())!;
          expect(Math.abs(box.height - (box.width * 9) / 16)).toBeLessThan(1);
        });
      });
    }
  });

  test.describe("when it is put fullscreen", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId("player").evaluate((v) => v.requestFullscreen());
      await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("VIDEO");
    });

    test.afterEach(async ({ page }) => {
      await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    });

    test("it should show the whole frame", async ({ page }) => {
      expect(await page.getByTestId("player").evaluate((v) => getComputedStyle(v).objectFit)).toBe("contain");
    });

    test("it should letterbox on the page's dark background", async ({ page }) => {
      expect(await page.getByTestId("player").evaluate((v) => getComputedStyle(v).backgroundColor)).toBe("rgb(18, 20, 26)");
    });
  });
});

test.describe("every clip the theater offers", () => {
  for (const id of theater) {
    const c = media.clips.find((m) => m.id === id)!;

    test(`${id} should be the window's 16:9 shape, so it fills the window with no bars`, async () => {
      expect(Math.abs(c.height - (c.width * 9) / 16)).toBeLessThan(1);
    });
  }
});

test.describe("when a scene is chosen", () => {
  for (const clip of media.clips.filter((c) => theater.includes(c.id))) {
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

test.describe("when a shell's line is copied", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  for (const sh of shells) {
    test.describe(`and it is ${sh.name}`, () => {
      test("it should copy that shell's line", async ({ page }) => {
        await page.goto("/");
        await page.locator(`[data-shell="${sh.name}"]`).getByRole("button", { name: /copy/i }).click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(sh.line);
      });
    });
  }
});
