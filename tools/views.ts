export interface Lens {
  name: string;
  about: string;
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

export function lenses(source: string): Lens[] {
  const list = source.match(/var Lenses = \[\]Lens\{([^}]*)\}/)?.[1];
  if (!list) throw new Error("lens.go: no Lenses list");
  const order = list.split(",").map((s) => s.trim()).filter(Boolean);
  const names = method(source, "Name", order);
  const abouts = method(source, "About", order);
  return order.map((l) => ({ name: names.get(l)!, about: abouts.get(l)! }));
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
