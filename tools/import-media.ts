import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { parse } from "yaml";
import { catalog, imageName, type Manifest } from "./media.ts";
import { lenses, viewFrames, type Scenario } from "./views.ts";

const usage = `Usage: node tools/import-media.ts [--help]

Imports the demo media filmed by the botropolis repo into this site.

  - stills and posters become WebP in src/assets/media/, which Astro resizes
  - clips are copied to .media/ under content-hashed names, for make media-upload
  - src/data/media.json describes all of it, and is what the page reads

GIFs are left behind; they are for the README.

Until the city films a still per lens, each lens is a frame of layers/views,
written as views-<name>.webp. The lenses, their order and their questions come
from the city's pkg/city/lens.go, and the second each is taken at from the
views shot's script in demo/scenarios/layers.yaml: half a second before the
next key. The import refuses a frame past the clip's end, a key for a lens the
city does not have, and a lens the clip never shows.

Environment:
  BOTROPOLIS_DIR  the botropolis checkout (default: ../botropolis)
  DEMO_DIR        the filmed media (default: $BOTROPOLIS_DIR/dist/demo)
  MEDIA_BASE      where uploaded clips are served (default: https://media.botropolis.city)
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(usage);
  process.exit(0);
}

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const demo = resolve(process.env.DEMO_DIR ?? join(botropolis, "dist/demo"));
const base = process.env.MEDIA_BASE ?? "https://media.botropolis.city";
const images = "src/assets/media";
const clipsOut = ".media";

const manifest: Manifest = JSON.parse(await readFile(join(demo, "manifest.json"), "utf8"));

const hashes = new Map<string, string>();
for (const m of manifest.media) {
  if (m.format === "gif") continue;
  hashes.set(m.file, createHash("sha256").update(await readFile(join(demo, m.file))).digest("hex").slice(0, 16));
}

const result = catalog(manifest, (file) => hashes.get(file)!, base);

const pictures = new Set<string>([
  ...manifest.media.filter((m) => m.kind === "image").map((m) => m.file),
  ...result.clips.map((c) => c.posterFile),
]);

await rm(images, { recursive: true, force: true });
await mkdir(images, { recursive: true });
for (const file of pictures) {
  await sharp(join(demo, file)).webp({ quality: 92 }).toFile(join(images, `${imageName(file)}.webp`));
}

const city = lenses(await readFile(join(botropolis, "pkg/city/lens.go"), "utf8"));
const scenario = parse(await readFile(join(botropolis, "demo/scenarios/layers.yaml"), "utf8")) as Scenario;
const viewsClip = manifest.media.find((m) => m.file === "layers/views.mp4");
if (!viewsClip?.seconds) throw new Error("the film has no layers/views.mp4 with a length");
const viewSection = viewFrames(scenario, city, viewsClip.seconds);
for (const f of viewSection.frames) {
  const png = execFileSync("ffmpeg", ["-v", "error", "-ss", String(f.at), "-i", join(demo, "layers/views.mp4"), "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 << 20 });
  if (!png.length) throw new Error(`ffmpeg returned no frame for ${f.name} at ${f.at} s`);
  await sharp(png).webp({ quality: 92 }).toFile(join(images, `${f.image}.webp`));
}
const views = { title: viewSection.title, frames: viewSection.frames.map(({ name, key, question, image }) => ({ name, key, question, image })) };

await mkdir(clipsOut, { recursive: true });
const wanted = new Set(result.clips.flatMap((c) => c.sources.map((s) => s.name)));
for (const stale of (await readdir(clipsOut)).filter((f) => !wanted.has(f))) await rm(join(clipsOut, stale));
for (const clip of result.clips) {
  for (const s of clip.sources) await copyFile(join(demo, s.file), join(clipsOut, s.name));
}

await writeFile("src/data/media.json", JSON.stringify({ ...result, views }, null, 2) + "\n");
console.log(`${pictures.size} images, ${wanted.size} clip files, version ${result.version}`);
