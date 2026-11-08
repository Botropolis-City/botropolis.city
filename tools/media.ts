export interface Anchor {
  x: number;
  y: number;
}

export interface ManifestEntry {
  file: string;
  kind: "image" | "video" | "animation";
  format: "png" | "mp4" | "webm" | "gif";
  scenario: string;
  shot: string;
  title: string;
  description: string;
  width: number;
  height: number;
  seconds?: number;
  poster?: string;
  view?: string;
  crop?: string;
  anchors?: Record<string, Anchor>;
}

export interface Manifest {
  generated: string;
  version: string;
  media: ManifestEntry[];
}

// Filmed is what drew an entry and what filmed it: the app's commit, the
// demo tool's commit when it differs, and when the film was made.
export interface Filmed {
  commit: string;
  film?: string;
  generated: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Detail is a crop of a still that must hold the anchors it names.
export interface Detail {
  box: Box;
  holds: string[];
  image: string;
}

export interface Still {
  id: string;
  scenario: string;
  shot: string;
  title: string;
  description: string;
  width: number;
  height: number;
  image: string;
  view?: string;
  anchors?: Record<string, Anchor>;
  filmed?: Filmed;
  detail?: Detail;
}

export interface Source {
  type: string;
  url: string;
  file: string;
  name: string;
}

export interface Crop {
  width: number;
  height: number;
  poster: string;
  posterFile: string;
  sources: Source[];
}

export interface Clip extends Omit<Still, "image" | "view" | "anchors" | "detail"> {
  seconds: number;
  poster: string;
  posterFile: string;
  sources: Source[];
  crops?: Record<string, Crop>;
}

export interface Catalog {
  version: string;
  generated: string;
  stills: Still[];
  clips: Clip[];
}

const videoTypes: Record<string, string> = { webm: "video/webm", mp4: "video/mp4" };
const sourceOrder = Object.keys(videoTypes);
const bySourceOrder = (a: Source, b: Source) => sourceOrder.indexOf(a.name.split(".").pop()!) - sourceOrder.indexOf(b.name.split(".").pop()!);

export const imageName = (file: string) => file.replace(/\.[^.]+$/, "").replace(/\//g, "-");

export function catalog(manifest: Manifest, hashOf: (file: string) => string, base: string, made?: { commit: string; film?: string }): Catalog {
  const filmed = made && { commit: made.commit, ...(made.film ? { film: made.film } : {}), generated: manifest.generated };
  const stills: Still[] = [];
  const clips = new Map<string, Clip>();
  const crops: ManifestEntry[] = [];

  for (const m of manifest.media) {
    const id = `${m.scenario}/${m.shot}`;
    const common = { id, scenario: m.scenario, shot: m.shot, title: m.title, description: m.description, width: m.width, height: m.height, ...(filmed ? { filmed } : {}) };

    if (m.kind === "image") {
      stills.push({ ...common, image: imageName(m.file), ...(m.view ? { view: m.view } : {}), ...(m.anchors ? { anchors: m.anchors } : {}) });
      continue;
    }
    const type = videoTypes[m.format];
    if (!type) continue;
    if (!m.poster) throw new Error(`${id}: a clip needs a poster`);
    if (m.crop) {
      crops.push(m);
      continue;
    }

    const clip = clips.get(id) ?? { ...common, seconds: m.seconds ?? 0, poster: imageName(m.poster), posterFile: m.poster, sources: [] };
    const name = `${hashOf(m.file)}.${m.format}`;
    clip.sources.push({ type, url: `${base}/${name}`, file: m.file, name });
    clips.set(id, clip);
  }

  for (const m of crops) {
    const id = `${m.scenario}/${m.shot}`;
    const clip = clips.get(id);
    if (!clip) throw new Error(`${id}: a ${m.crop} crop of a clip the film did not make`);
    clip.crops ??= {};
    const crop = (clip.crops[m.crop!] ??= { width: m.width, height: m.height, poster: imageName(m.poster!), posterFile: m.poster!, sources: [] });
    const name = `${hashOf(m.file)}.${m.format}`;
    crop.sources.push({ type: videoTypes[m.format], url: `${base}/${name}`, file: m.file, name });
  }

  for (const clip of clips.values()) {
    clip.sources.sort(bySourceOrder);
    for (const crop of Object.values(clip.crops ?? {})) crop.sources.sort(bySourceOrder);
  }

  return { version: manifest.version, generated: manifest.generated, stills, clips: [...clips.values()] };
}

const imagesOf = (c: Catalog) =>
  new Set([
    ...c.stills.flatMap((s) => [s.image, ...(s.detail ? [s.detail.image] : [])]),
    ...c.clips.flatMap((c) => [c.poster, ...Object.values(c.crops ?? {}).map((crop) => crop.poster)]),
  ]);

// merge lays a partial film over the catalog: every entry it names is
// replaced or added, every other entry is kept with what filmed it, and
// the images only the replaced entries used come back as stale. Entries
// that say nothing of what filmed them take the commit given, or refuse.
export function merge(existing: Catalog, partial: Catalog, existingCommit?: string): { catalog: Catalog; stale: string[] } {
  if (partial.version !== existing.version) throw new Error(`merge: the film is ${partial.version}, the catalog ${existing.version}; import a whole film instead`);
  const stamp = <T extends { id: string; filmed?: Filmed }>(e: T): T => {
    if (e.filmed) return e;
    if (!existingCommit) throw new Error(`merge: ${e.id} says nothing of the commit that drew it; give the catalog's commit`);
    return { ...e, filmed: { commit: existingCommit, generated: existing.generated } };
  };
  const over = <T extends { id: string; filmed?: Filmed }>(kept: T[], added: T[]) => {
    const byId = new Map(kept.map((e) => [e.id, stamp(e)]));
    for (const e of added) byId.set(e.id, e);
    return [...byId.values()];
  };
  const catalog: Catalog = { version: existing.version, generated: partial.generated, stills: over(existing.stills, partial.stills), clips: over(existing.clips, partial.clips) };
  const now = imagesOf(catalog);
  return { catalog, stale: [...imagesOf(existing)].filter((i) => !now.has(i)) };
}

// detail gives a still a crop of its own, refusing a box that does not
// hold every anchor it names.
export function detail(still: Still, spec: { box: Box; holds: string[] }): Still {
  const { box, holds } = spec;
  for (const name of holds) {
    const a = still.anchors?.[name];
    if (!a) throw new Error(`${still.id}: the detail holds ${name}, and the still has no such anchor`);
    if (a.x < box.x || a.x > box.x + box.width || a.y < box.y || a.y > box.y + box.height) throw new Error(`${still.id}: ${name} at (${a.x}, ${a.y}) falls outside the detail's box`);
  }
  return { ...still, detail: { box, holds, image: `${still.image}-detail` } };
}
