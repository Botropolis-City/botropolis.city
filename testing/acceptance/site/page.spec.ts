import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import media from "../../../src/data/media.json" with { type: "json" };
import { hotspots } from "../../../src/data/glance.ts";
import { distros, shells } from "../../../src/data/install.ts";
import { release } from "../../../src/data/release.ts";
import { stale } from "../../../src/data/stale.ts";
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

test.describe("when the views section is shown", () => {
  const section = (page: Page) => page.locator("#views");
  const tabs = (page: Page) => section(page).getByRole("group", { name: "Views" }).locator("[data-view]");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("it should be titled for the city's six lenses", async ({ page }) => {
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText("Six ways to read the city");
  });

  test("it should offer one tab per lens, and night", async ({ page }) => {
    await expect(tabs(page)).toHaveText(["1Attention", "2Work", "3Cost", "4Capacity", "5Health", "6Connections", "nNight"]);
  });

  test.describe("and a lens is chosen", () => {
    test("it should ask that lens's question in the city's words", async ({ page }) => {
      await tabs(page).filter({ hasText: "Cost" }).click();
      await expect(section(page).locator("[data-question]")).toHaveText("What each session has spent, and on which models.");
    });
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

test.describe("when the reader reaches the release's section", () => {
  const section = (page: Page) => page.locator("#new");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("it should be titled with the release's version", async ({ page }) => {
    await expect(section(page).locator(".eyebrow")).toContainText(release.version);
  });

  test("it should be headed with the headline its tests hold to the table", async ({ page }) => {
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText(release.headline.text);
  });

  test("it should say the machine its figures were measured on", async ({ page }) => {
    await expect(section(page)).toContainText(release.measuredOn);
  });

  for (const f of release.figures) {
    test.describe(`and it is ${f.label}`, () => {
      test("it should show the figure as the changelog gives it", async ({ page }) => {
        await expect(section(page).getByRole("row", { name: f.label })).toHaveText(`${f.label}${f.before}${f.after}`);
      });
    });
  }

  for (const m of release.misses) {
    test.describe(`and it is the missed budget "${m.text}"`, () => {
      test("it should say so", async ({ page }) => {
        await expect(section(page)).toContainText(m.text);
      });
    });
  }
});

test.describe("when the reader reaches the map", () => {
  const spots = (page: Page) => page.locator("#glance .spot");

  for (const width of [1440, 360]) {
    test.describe(`and the viewport is ${width} wide`, () => {
      test.use({ viewport: { width, height: 900 } });

      test("it should overlap no two hotspots", async ({ page }) => {
        await page.goto("/");
        const boxes = await spots(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map(({ left, top, right, bottom }) => ({ left, top, right, bottom })));
        const overlapping = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).map((_, j) => [i, i + 1 + j]));
        expect(overlapping).toEqual([]);
      });

      for (const [i, h] of hotspots.entries()) {
        test.describe(`and the ${h.title} card is open`, () => {
          test("it should lie wholly inside the map frame", async ({ page }) => {
            await page.goto("/");
            const spot = spots(page).nth(i);
            await spot.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
            await spot.hover();
            const card = spot.locator(".card");
            await expect(card).toHaveCSS("opacity", "1");
            await page.waitForTimeout(200);
            const frame = await page.getByTestId("map-frame").evaluate((el) => el.getBoundingClientRect().toJSON());
            const box = await card.evaluate((el) => el.getBoundingClientRect().toJSON());
            const outside = [box.left < frame.left - 0.5 && "left", box.right > frame.right + 0.5 && "right", box.top < frame.top - 0.5 && "top", box.bottom > frame.bottom + 0.5 && "bottom"].filter(Boolean);
            expect(outside).toEqual([]);
          });
        });
      }
    });
  }

  test.describe("and the viewport is 360 wide", () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test("it should let the map scroll sideways inside its frame", async ({ page }) => {
      await page.goto("/");
      expect(await page.getByTestId("map-frame").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    });

    test('it should say "drag to see the city"', async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("drag to see the city")).toBeVisible();
    });
  });
});

test.describe("when the reader reaches the install section", () => {
  test("it should tell an upgrader to restart the daemon with botropolis setup", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("upgrade")).toContainText("restart the daemon with botropolis setup");
  });
});

test.describe("when the page loads", () => {
  const said = (page: Page) =>
    page.evaluate(() =>
      [document.body.innerText, ...[...document.querySelectorAll("img[alt]")].map((i) => i.getAttribute("alt")), ...[...document.querySelectorAll("meta[content]")].map((m) => m.getAttribute("content"))].join("\n"),
    );

  for (const phrase of stale) {
    test.describe(`and it is the sentence 0.3.0 made false, "${phrase}"`, () => {
      test("it should not say it", async ({ page }) => {
        await page.goto("/");
        expect((await said(page)).includes(phrase)).toBe(false);
      });
    });
  }
});
