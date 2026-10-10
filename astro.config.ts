import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://botropolis.city",
  outDir: "./dist",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "always", format: "file" },
  vite: { build: { assetsInlineLimit: 0 } },
});
