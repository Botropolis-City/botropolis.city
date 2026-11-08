import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { parse } from "yaml";
import { heroMedia, socialCard } from "../src/data/hero.ts";
import { details } from "./details.ts";
import { catalog, detail, imageName, merge, type Catalog, type Manifest } from "./media.ts";
import { lenses, viewFrames, viewStills, type Scenario } from "./views.ts";

const usage = `Usage: node tools/import-media.ts [--help]

Imports the demo media filmed by the botropolis repo into this site.

  - stills and posters become WebP in src/assets/media/, which Astro resizes
  - clips are copied to .media/ under content-hashed names, for make media-upload
  - src/data/media.json describes all of it, and is what the page reads

GIFs are left behind; they are for the README.

Each lens shows the film's still of the view its key opens on, and night its
night still. The lenses, their order, their questions and their first views come
from the city's pkg/city/lens.go and view.go; the import refuses a lens whose
view the film has no still of.

A film made before the stills existed falls back to frames of layers/views,
written as views-<name>.webp, each taken half a second before the next key of
the views shot's script in demo/scenarios/layers.yaml. The import refuses a
frame past the clip's end, a key for a lens the city does not have, and a lens
the clip never shows.

It ends by listing every stand-in still in use: what the page shows in place of
something the film did not make.

A still named in tools/details.ts also gets a cropped WebP, <image>-detail,
and the import refuses a box that does not hold the anchors it names.

With MERGE=1 the film is partial: its entries replace or join those already in
src/data/media.json, which keeps every other entry, image, clip and the views.
It refuses a film of another version, adds only the clips it names to .media/,
and removes only the images no entry uses any more.

Environment:
  BOTROPOLIS_DIR  the botropolis checkout (default: ../botropolis)
  DEMO_DIR        the filmed media (default: $BOTROPOLIS_DIR/dist/demo)
  MEDIA_BASE      where uploaded clips are served (default: https://media.botropolis.city)
  APP_COMMIT      the botropolis commit whose city the film draws; required with MERGE
  FILM_COMMIT     the commit of the demo tool and scenarios, when it is not APP_COMMIT
  CATALOG_COMMIT  with MERGE, the app commit of entries media.json does not yet credit
  MERGE           1 to merge a partial film
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

const appCommit = process.env.APP_COMMIT;
const filmCommit = process.env.FILM_COMMIT;
const merging = process.env.MERGE === "1";
if (merging && !appCommit) throw new Error("MERGE needs APP_COMMIT: the botropolis commit whose city the film draws");
const made = appCommit ? { commit: appCommit, ...(filmCommit && filmCommit !== appCommit ? { film: filmCommit } : {}) } : undefined;
const filmed = catalog(manifest, (file) => hashes.get(file)!, base, made);
filmed.stills = filmed.stills.map((s) => (details[s.id] ? detail(s, details[s.id]) : s));

if (merging) {
  const existing = JSON.parse(await readFile("src/data/media.json", "utf8")) as Catalog & { views: unknown };
  const { catalog: merged, stale } = merge(existing, filmed, process.env.CATALOG_COMMIT);
  await mkdir(images, { recursive: true });
  for (const s of filmed.stills) {
    const file = manifest.media.find((m) => m.kind === "image" && `${m.scenario}/${m.shot}` === s.id)!.file;
    await sharp(join(demo, file)).webp({ quality: 92 }).toFile(join(images, `${s.image}.webp`));
    if (s.detail) {
      const { x, y, width, height } = s.detail.box;
      await sharp(join(demo, file)).extract({ left: x, top: y, width, height }).webp({ quality: 92 }).toFile(join(images, `${s.detail.image}.webp`));
    }
  }
  for (const c of filmed.clips) {
    await sharp(join(demo, c.posterFile)).webp({ quality: 92 }).toFile(join(images, `${c.poster}.webp`));
    for (const crop of Object.values(c.crops ?? {})) await sharp(join(demo, crop.posterFile)).webp({ quality: 92 }).toFile(join(images, `${crop.poster}.webp`));
  }
  for (const image of stale) await rm(join(images, `${image}.webp`), { force: true });
  await mkdir(clipsOut, { recursive: true });
  const added = filmed.clips.flatMap((c) => [...c.sources, ...Object.values(c.crops ?? {}).flatMap((crop) => crop.sources)]);
  for (const s of added) await copyFile(join(demo, s.file), join(clipsOut, s.name));
  await writeFile("src/data/media.json", JSON.stringify({ ...merged, views: existing.views }, null, 2) + "\n");
  console.log(`merged ${filmed.stills.length} stills and ${filmed.clips.length} clips (${added.length} clip files) into version ${merged.version}; removed ${stale.length} stale images`);
  process.exit(0);
}

const result = filmed;

const pictures = new Set<string>([
  ...manifest.media.filter((m) => m.kind === "image").map((m) => m.file),
  ...result.clips.map((c) => c.posterFile),
  ...result.clips.flatMap((c) => Object.values(c.crops ?? {}).map((crop) => crop.posterFile)),
]);
const standIns: string[] = [];
if (heroMedia(result).kind === "still") standIns.push("hero: the metropolis/hero still with a CSS drift, since the film has no metropolis/loop");
if (!result.stills.find((s) => s.id === "metropolis/hero")?.anchors) standIns.push("map key: every hotspot placed by hand, since the metropolis/hero still has no anchors");
if (socialCard(result).crop) standIns.push("link preview: metropolis/hero cropped to 1200x630, since the film has no metropolis/card");

await rm(images, { recursive: true, force: true });
await mkdir(images, { recursive: true });
for (const file of pictures) {
  await sharp(join(demo, file)).webp({ quality: 92 }).toFile(join(images, `${imageName(file)}.webp`));
}
for (const s of result.stills.filter((s) => s.detail)) {
  const file = manifest.media.find((m) => m.kind === "image" && `${m.scenario}/${m.shot}` === s.id)!.file;
  const { x, y, width, height } = s.detail!.box;
  await sharp(join(demo, file)).extract({ left: x, top: y, width, height }).webp({ quality: 92 }).toFile(join(images, `${s.detail!.image}.webp`));
}

const city = lenses(await readFile(join(botropolis, "pkg/city/lens.go"), "utf8"), await readFile(join(botropolis, "pkg/city/view.go"), "utf8"));
const scenario = parse(await readFile(join(botropolis, "demo/scenarios/layers.yaml"), "utf8")) as Scenario;
let views = viewStills(manifest, scenario, city);
if (!views) {
  standIns.push("views: frames cut from layers/views.mp4, since the film has no still per view");
  const viewsClip = manifest.media.find((m) => m.file === "layers/views.mp4");
  if (!viewsClip?.seconds) throw new Error("the film has no layers/views.mp4 with a length");
  const viewSection = viewFrames(scenario, city, viewsClip.seconds);
  for (const f of viewSection.frames) {
    const png = execFileSync("ffmpeg", ["-v", "error", "-ss", String(f.at), "-i", join(demo, "layers/views.mp4"), "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 << 20 });
    if (!png.length) throw new Error(`ffmpeg returned no frame for ${f.name} at ${f.at} s`);
    await sharp(png).webp({ quality: 92 }).toFile(join(images, `${f.image}.webp`));
  }
  views = { title: viewSection.title, frames: viewSection.frames.map(({ name, key, question, image }) => ({ name, key, question, image })) };
}

await mkdir(clipsOut, { recursive: true });
const sources = result.clips.flatMap((c) => [...c.sources, ...Object.values(c.crops ?? {}).flatMap((crop) => crop.sources)]);
const wanted = new Set(sources.map((s) => s.name));
for (const stale of (await readdir(clipsOut)).filter((f) => !wanted.has(f))) await rm(join(clipsOut, stale));
for (const s of sources) await copyFile(join(demo, s.file), join(clipsOut, s.name));

await writeFile("src/data/media.json", JSON.stringify({ ...result, views }, null, 2) + "\n");
console.log(`${pictures.size} images, ${wanted.size} clip files, version ${result.version}`);
console.log(standIns.length ? `stand-ins still in use:\n${standIns.map((s) => `  - ${s}`).join("\n")}` : "no stand-ins: the film made everything the page shows");
