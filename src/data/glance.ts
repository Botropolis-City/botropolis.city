export interface Hotspot {
  title: string;
  line: string;
  x: number;
  y: number;
  tone: string;
}

export const hotspots: Hotspot[] = [
  { title: "radio towers", line: "MCP servers, standing on the ridge", x: 52.5, y: 13, tone: "var(--working)" },
  { title: "a session", line: "one to five storeys by how much work it has done; its beacon is its state", x: 66.7, y: 38, tone: "var(--working)" },
  { title: "plaza", line: "the civic centre: power plant, city hall, library", x: 49, y: 39, tone: "var(--plant)" },
  { title: "fountain", line: "the plaza's centrepiece; it means nothing", x: 50, y: 47, tone: "var(--dim)" },
  { title: "unattended", line: "a session running with nobody watching it", x: 41.5, y: 44.5, tone: "var(--unattended)" },
  { title: "depot", line: "where packed-up sessions are kept, a crate each and a row per project", x: 15.6, y: 47.7, tone: "var(--resting)" },
  { title: "river", line: "new sessions arrive by tug; boats read your plan's usage", x: 82, y: 57.5, tone: "var(--plant)" },
];

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
