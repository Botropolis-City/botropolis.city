import { defineConfig, devices } from "@playwright/test";

const live = process.env.BASE_URL;
const port = 8788;

export default defineConfig({
  testDir: "testing/acceptance/site",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: live ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: live ?? `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    ...(process.env.CI ? { channel: "chrome" } : { launchOptions: { executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium" } }),
  },
  webServer: live
    ? undefined
    : { command: `npx wrangler dev --ip 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
});
