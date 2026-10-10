export interface Hotspot {
  title: string;
  line: string;
  x: number;
  y: number;
  tone: string;
}

export const hotspots: Hotspot[] = [
  { title: "radio towers", line: "MCP servers, standing on the ridge", x: 50, y: 12, tone: "var(--working)" },
  { title: "a session", line: "as tall as the context it has used; its beacon is its state", x: 66.7, y: 38, tone: "var(--working)" },
  { title: "plaza", line: "the civic centre: power plant, city hall, library", x: 49, y: 39, tone: "var(--plant)" },
  { title: "fountain", line: "the plaza's centrepiece; it means nothing", x: 50, y: 47, tone: "var(--dim)" },
  { title: "unattended", line: "a session running with nobody watching it", x: 39.4, y: 46, tone: "var(--unattended)" },
  { title: "storage yard", line: "parked sessions, one container each, one colour per project", x: 21, y: 54, tone: "var(--parked)" },
  { title: "park", line: "planned green: no project has this block", x: 36.5, y: 59, tone: "var(--merged)" },
  { title: "river", line: "new sessions arrive by tug; boats read your plan's usage", x: 82, y: 57.5, tone: "var(--plant)" },
];

export const states = [
  { name: "needs-you", tone: "var(--needs-you)", line: "waiting on an answer from you" },
  { name: "working", tone: "var(--working)", line: "mid-turn" },
  { name: "waiting", tone: "var(--waiting)", line: "handed the turn back, but set its own wakeup" },
  { name: "unattended", tone: "var(--unattended)", line: "running with nobody watching" },
  { name: "parked", tone: "var(--parked)", line: "in the storage yard until you wake it" },
];

export const glossary = [
  ["power plant", "the API: spend by model, project and session over an hour, a day or a week"],
  ["wires", "each session's live token rate, run from the plant"],
  ["drones", "subagents in flight, circling the roof"],
  ["flags", "pull requests, green once merged"],
  ["smoke", "API errors"],
  ["library", "skills, ranked by use"],
  ["avenues", "projects whose sessions message each other or edit each other's files"],
  ["freight loop", "the day's tokens: one train per model, a wagon per unit"],
] as const;
