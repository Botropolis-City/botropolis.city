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

export interface Clip extends Omit<Still, "image" | "view" | "anchors"> {
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

export function catalog(manifest: Manifest, hashOf: (file: string) => string, base: string): Catalog {
  const stills: Still[] = [];
  const clips = new Map<string, Clip>();
  const crops: ManifestEntry[] = [];

  for (const m of manifest.media) {
    const id = `${m.scenario}/${m.shot}`;
    const common = { id, scenario: m.scenario, shot: m.shot, title: m.title, description: m.description, width: m.width, height: m.height };

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
