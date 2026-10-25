import { imageName, type Manifest } from "./media.ts";

export interface Lens {
  name: string;
  about: string;
  // view is the view the lens's key opens on, when view.go was read.
  view?: string;
}

export interface Shot {
  name: string;
  title: string;
  description: string;
  record?: { seconds: number };
  script?: { at: number; key: string }[];
}

export interface Scenario {
  shots: Shot[];
}

export interface ViewFrame {
  name: string;
  key: string;
  question: string;
  image: string;
  at: number;
}

const settle = 0.5;

function method(source: string, name: string, order: string[]): Map<string, string> {
  const body = source.match(new RegExp(`func \\(l Lens\\) ${name}\\(\\) string \\{\\n([\\s\\S]*?)\\n\\}`))?.[1];
  if (!body) throw new Error(`lens.go: no Lens.${name}()`);
  const found = new Map([...body.matchAll(/case (\w+):\s*return "([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const fallback = body.match(/\}\s*return "([^"]*)"\s*$/)?.[1];
  const rest = order.filter((l) => !found.has(l));
  if (fallback !== undefined && rest.length === 1) found.set(rest[0], fallback);
  else if (rest.length) throw new Error(`lens.go: Lens.${name}() cannot tell apart ${rest.join(", ")}`);
  return found;
}

export function lenses(source: string, viewSource?: string): Lens[] {
  const list = source.match(/var Lenses = \[\]Lens\{([^}]*)\}/)?.[1];
  if (!list) throw new Error("lens.go: no Lenses list");
  const order = list.split(",").map((s) => s.trim()).filter(Boolean);
  const names = method(source, "Name", order);
  const abouts = method(source, "About", order);
  const firsts = viewSource ? firstViews(source, viewSource, order) : undefined;
  return order.map((l) => ({ name: names.get(l)!, about: abouts.get(l)!, ...(firsts ? { view: firsts.get(l)! } : {}) }));
}

// firstViews is the view each lens's key opens, by the view's own name:
// the first in Lens.Views(), named by View.Name() in view.go.
function firstViews(source: string, viewSource: string, order: string[]): Map<string, string> {
  const body = source.match(/func \(l Lens\) Views\(\) \[\]View \{\n([\s\S]*?)\n\}/)?.[1];
  if (!body) throw new Error("lens.go: no Lens.Views()");
  const first = new Map([...body.matchAll(/case (\w+):\s*return \[\]View\{(\w+)/g)].map((m) => [m[1], m[2]]));
  const fallback = body.match(/\}\s*return \[\]View\{(\w+)/)?.[1];
  const nameBody = viewSource.match(/func \(v View\) Name\(\) string \{\n([\s\S]*?)\n\}/)?.[1];
  if (!nameBody) throw new Error("view.go: no View.Name()");
  const viewNames = new Map([...nameBody.matchAll(/case (\w+):\s*return "([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const viewDefault = nameBody.match(/default:\s*return "([^"]*)"/)?.[1];
  const out = new Map<string, string>();
  for (const l of order) {
    const v = first.get(l) ?? fallback;
    const name = v && (viewNames.get(v) ?? viewDefault);
    if (!name) throw new Error(`lens.go: cannot tell which view ${l} opens on`);
    out.set(l, name);
  }
  return out;
}

// viewStills is the section from the film's own stills, one per lens's
// first view, then night; undefined when the film made none, so the
// import can fall back to frames of the views clip (item 76).
export function viewStills(manifest: Manifest, scenario: Scenario, city: Lens[]): { title: string; frames: Omit<ViewFrame, "at">[] } | undefined {
  const stills = manifest.media.filter((m) => m.kind === "image");
  if (!stills.some((m) => m.view)) return undefined;
  const shot = scenario.shots.find((s) => s.name === "views");
  if (!shot) throw new Error("layers.yaml: no views shot to title the section");
  const frames = city.map((lens, i) => {
    const m = stills.find((s) => s.view === lens.view);
    if (!m) throw new Error(`views: the ${lens.name} lens opens on ${lens.view}, and the film has no still of it`);
    return { name: lens.name, key: String(i + 1), question: lens.about, image: imageName(m.file) };
  });
  const night = stills.find((s) => s.scenario === "layers" && s.shot === "night");
  if (night) frames.push({ name: "Night", key: "n", question: night.description, image: imageName(night.file) });
  return { title: shot.title, frames };
}

export function viewFrames(scenario: Scenario, city: Lens[], seconds: number): { title: string; frames: ViewFrame[] } {
  const shot = scenario.shots.find((s) => s.name === "views");
  if (!shot?.script) throw new Error("layers.yaml: no views shot with a script");
  const night = scenario.shots.find((s) => s.name === "night");
  const script = shot.script;

  const shown = new Map<string, ViewFrame>();
  let dark = false;
  script.forEach(({ at, key }, i) => {
    const next = script[i + 1]?.at ?? seconds;
    const frame = (name: string, label: string, question: string) => {
      const t = next - settle;
      if (t >= seconds) throw new Error(`views: the ${name} frame, at ${t} s, is past the clip's end at ${seconds} s`);
      if (!shown.has(name)) shown.set(name, { name, key: label, question, image: `views-${name.toLowerCase()}`, at: t });
    };

    const digit = key.match(/^Digit(\d)$/);
    if (digit) {
      const lens = city[Number(digit[1]) - 1];
      if (!lens) throw new Error(`views: ${key} names a lens the city does not have`);
      frame(lens.name, digit[1], lens.about);
    } else if (key === "N") {
      dark = !dark;
      if (dark) frame("Night", "n", night?.description ?? "");
    }
  });

  const missing = city.filter((l) => !shown.has(l.name)).map((l) => l.name);
  if (missing.length) throw new Error(`views: the clip never shows ${missing.join(", ")}`);

  const frames = [...city.map((l) => shown.get(l.name)!), ...(shown.has("Night") ? [shown.get("Night")!] : [])];
  return { title: shot.title, frames };
}
