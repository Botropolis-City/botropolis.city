import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { catalog, imageName, type Manifest } from "./media.ts";

const usage = `Usage: node tools/import-media.ts [--help]

Imports the demo media filmed by the botropolis repo into this site.

  - stills and posters become WebP in src/assets/media/, which Astro resizes
  - clips are copied to .media/ under content-hashed names, for make media-upload
  - src/data/media.json describes all of it, and is what the page reads

GIFs are left behind; they are for the README.

Until the city films a still per view, each view is a frame of layers/views,
taken at the second the table below names, and written as views-<name>.webp.

Environment:
  DEMO_DIR    the filmed media (default: ../botropolis/dist/demo)
  MEDIA_BASE  where uploaded clips are served (default: https://media.botropolis.city)
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(usage);
  process.exit(0);
}

const demo = resolve(process.env.DEMO_DIR ?? "../botropolis/dist/demo");
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

const viewFrames: [string, string, number][] = [
  ["attention", "who wants me", 30],
  ["spend", "where the money went", 4],
  ["pressure", "who is about to compact", 6.8],
  ["staleness", "what has gone quiet", 9],
  ["servers", "what breaks if a server goes down", 11.8],
  ["traffic", "which repos talk to each other", 14],
  ["models", "where the models are", 16.8],
  ["fan-out", "which sessions spawn armies", 19],
  ["health", "what is broken, what shipped", 21.3],
  ["night", "lit windows are the sessions that are awake", 25],
];
for (const [name, , at] of viewFrames) {
  const png = execFileSync("ffmpeg", ["-v", "error", "-ss", String(at), "-i", join(demo, "layers/views.mp4"), "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 << 20 });
  await sharp(png).webp({ quality: 92 }).toFile(join(images, `views-${name}.webp`));
}
const views = viewFrames.map(([name, question]) => ({ name, question, image: `views-${name}` }));

await mkdir(clipsOut, { recursive: true });
const wanted = new Set(result.clips.flatMap((c) => c.sources.map((s) => s.name)));
for (const stale of (await readdir(clipsOut)).filter((f) => !wanted.has(f))) await rm(join(clipsOut, stale));
for (const clip of result.clips) {
  for (const s of clip.sources) await copyFile(join(demo, s.file), join(clipsOut, s.name));
}

await writeFile("src/data/media.json", JSON.stringify({ ...result, views }, null, 2) + "\n");
console.log(`${pictures.size} images, ${wanted.size} clip files, version ${result.version}`);
