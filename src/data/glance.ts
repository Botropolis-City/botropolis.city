export type Ground = "plate" | "plaza" | "grass" | "water" | "object";

export interface Hotspot {
  title: string;
  line: string;
  quote: string;
  source: string;
  on: Ground;
  x: number;
  y: number;
  tone: string;
}

export const still = { file: "src/assets/media/metropolis-hero.webp", width: 1920, height: 1080, districts: 12 };

const kinds = "pkg/city/kinds.go";
const district = (title: string, px: number, py: number) =>
  spot({ title, line: "a directory where sessions run", source: kinds, on: "plate", px, py, tone: "var(--dim)" });

function spot(s: { title: string; line: string; quote?: string; source: string; on: Ground; px: number; py: number; tone: string }): Hotspot {
  return {
    title: s.title,
    line: s.line,
    quote: s.quote ?? s.line,
    source: s.source,
    on: s.on,
    x: Math.round((s.px / still.width) * 10000) / 100,
    y: Math.round((s.py / still.height) * 10000) / 100,
    tone: s.tone,
  };
}

export const hotspots: Hotspot[] = [
  spot({ title: "trains", line: "Each train on the loop is one model. Its length is that model's share of today's tokens.", source: kinds, on: "object", px: 915, py: 112, tone: "var(--plant)" }),
  spot({ title: "radio towers", line: "Each radio tower is an MCP server.", source: kinds, on: "object", px: 988, py: 105, tone: "var(--dim)" }),
  spot({ title: "library", line: "The library holds the skills sessions have used, and how often.", source: kinds, on: "object", px: 885, py: 450, tone: "var(--plant)" }),
  spot({ title: "power plant", line: "The power plant is the city's spend: tokens and cost across every session.", source: kinds, on: "object", px: 970, py: 405, tone: "var(--plant)" }),
  spot({ title: "plaza", line: "the civic centre", source: kinds, on: "plaza", px: 1050, py: 500, tone: "var(--plant)" }),
  spot({
    title: "working",
    line: "While Claude is mid-turn the roof is scaffolded, and each tool it uses sends a load up the hoist on the building's corner.",
    source: kinds,
    on: "object",
    px: 1022,
    py: 590,
    tone: "var(--working)",
  }),
  spot({
    title: "resting",
    line: "A stopped session stays on its own lot: resting, then shuttered after a week of quiet and overgrown after a month, and its card says how long it has been quiet.",
    source: "README.md",
    on: "object",
    px: 1067,
    py: 355,
    tone: "var(--resting)",
  }),
  spot({
    title: "unattended",
    line: "A background session with no terminal attached.",
    quote: "with no terminal attached",
    source: "design/session-lifecycle.md",
    on: "object",
    px: 797,
    py: 481,
    tone: "var(--unattended)",
  }),
  spot({ title: "road", line: "A road joins two projects that sessions crossed between, by messages or by files.", source: kinds, on: "object", px: 1330, py: 545, tone: "var(--dim)" }),
  spot({ title: "depot", line: "where packed-up sessions are kept", source: "pkg/city/depot.go", on: "object", px: 300, py: 515, tone: "var(--resting)" }),
  spot({
    title: "river",
    line: "The river runs through the island to the sea. Its boats carry your usage and the sessions arriving and leaving.",
    source: kinds,
    on: "water",
    px: 1600,
    py: 660,
    tone: "var(--plant)",
  }),
  district("quillmark", 900, 225),
  district("saltmarsh", 1030, 280),
  district("beacon", 905, 340),
  district("thistledown", 1270, 350),
  district("ferrylight", 790, 390),
  district("copperleaf", 1130, 430),
  district("tidepool", 1460, 440),
  district("lanternfish", 640, 480),
  district("driftwood", 1230, 480),
  district("millrace", 880, 580),
  district("kiln", 1120, 600),
  district("orchard", 1060, 650),
];

const references: [Ground, [number, number, number]][] = [
  ["plate", [193, 192, 183]],
  ["plaza", [179, 178, 181]],
  ["water", [78, 138, 186]],
  ["water", [111, 167, 208]],
];

export function classify([r, g, b]: [number, number, number]): Ground {
  for (const [ground, [rr, rg, rb]] of references) {
    if (Math.hypot(r - rr, g - rg, b - rb) <= (ground === "water" ? 20 : 8)) return ground;
  }
  if (g > r + 12 && g > b + 12) return "grass";
  return "object";
}

export const states = [
  { name: "needs-you", tone: "var(--needs-you)", line: "waiting on an answer from you" },
  { name: "working", tone: "var(--working)", line: "mid-turn" },
  { name: "waiting", tone: "var(--waiting)", line: "handed the turn back, but set its own wakeup" },
  { name: "unattended", tone: "var(--unattended)", line: "running with nobody watching" },
  { name: "resting", tone: "var(--resting)", line: "stopped, and still on its own lot until you resume it" },
];

export const glossary = [
  ["power plant", "the API: spend by model, project and session over an hour, a day or a week"],
  ["wires", "each session's live token rate, run from the plant"],
  ["drones", "one for each subagent in flight, working on its building"],
  ["flags", "pull requests, when a project has them; a merge sends a truck off the island by the bridge"],
  ["smoke", "API errors"],
  ["library", "skills, ranked by use"],
  ["roads", "laid between projects whose sessions message each other or edit each other's files"],
  ["freight loop", "the day's tokens: one train per model, a wagon per unit of spend"],
] as const;
