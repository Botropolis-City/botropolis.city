import { readFile } from "node:fs/promises";

export interface Release {
  version: string;
  date: string;
  url: string;
  notes: string;
}

export interface Segment {
  text: string;
  code?: true;
}

export interface Section {
  heading: string;
  items: Segment[][];
}

type Env = Record<string, string | undefined>;
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const endpoint = "https://api.github.com/repos/Botropolis-City/botropolis/releases/latest";

export function parseRelease(json: unknown): Release {
  if (typeof json !== "object" || json === null) throw new Error("the latest release is not an object");
  const r = json as Record<string, unknown>;
  if (typeof r.tag_name !== "string") throw new Error("the latest release has no tag_name");
  const version = r.tag_name.replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`the latest release's tag ${r.tag_name} is not a version`);
  if (typeof r.body !== "string" || r.body.trim() === "") throw new Error(`the latest release, ${r.tag_name}, has no notes`);
  if (typeof r.published_at !== "string" || typeof r.html_url !== "string") throw new Error(`the latest release, ${r.tag_name}, has no date or link`);
  return { version, date: r.published_at.slice(0, 10), url: r.html_url, notes: r.body };
}

function lead(bullet: string): string {
  if (bullet.startsWith("**")) {
    const end = bullet.indexOf("**", 2);
    if (end > 2) return bullet.slice(2, end);
  }
  const stop = bullet.search(/\.(\s|$)/);
  return stop < 0 ? bullet : bullet.slice(0, stop + 1);
}

function segments(text: string): Segment[] {
  const plain = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return plain
    .split("`")
    .map((t, i): Segment => (i % 2 === 1 ? { text: t, code: true } : { text: t }))
    .filter((s) => s.text !== "");
}

export function highlights(notes: string): Section[] {
  const sections: Section[] = [];
  for (const line of notes.split("\n")) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading?.[1]) {
      sections.push({ heading: heading[1], items: [] });
      continue;
    }
    const bullet = line.match(/^- (.+)$/);
    const current = sections.at(-1);
    if (bullet?.[1] && current) current.items.push(segments(lead(bullet[1].trim())));
  }
  return sections.filter((s) => s.items.length > 0);
}

export async function loadRelease(env: Env = process.env, fetcher: Fetcher = fetch): Promise<Release> {
  if (env.BOTROPOLIS_RELEASE) return parseRelease(JSON.parse(await readFile(env.BOTROPOLIS_RELEASE, "utf8")));
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "botropolis.city" };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const res = await fetcher(endpoint, { headers });
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${endpoint}; the site will not build on a guess`);
  return parseRelease(await res.json());
}

export function versionsIn(text: string): string[] {
  const prose = text.replace(/\sd="[^"]*"/g, " ");
  return [...prose.matchAll(/(?<![\w.])v?(\d+\.\d+\.(?:\d+|x))(?!\w|\.\d)/g)].map((m) => m[1] ?? "");
}
