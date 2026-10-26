export interface Figure {
  label: string;
  before: string;
  after: string;
  quote: string;
}

export interface Miss {
  text: string;
  quote: string;
}

export interface Amount {
  value: string;
  scale: number;
}

export interface Ratio {
  phrase: string;
  figure: string;
  before: Amount;
  after: Amount;
  factor: number;
}

export const versions = {
  protocolSince: "0.3.0",
  protocolBefore: "0.2",
  promise: "1.0.0",
};

export const release = {
  measured: "0.3.0",
  against: "0.2.2",
  continues: "0.3.x",
  headline: {
    text: "Up to four times faster to draw, on a tenth of 0.2.2's memory",
    ratios: [
      {
        phrase: "Up to four times faster to draw",
        figure: "Drawing a frame, focused",
        before: { value: "48", scale: 1 },
        after: { value: "11", scale: 1 },
        factor: 4,
      },
      {
        phrase: "a tenth of 0.2.2's memory",
        figure: "The city's memory, settled",
        before: { value: "4.6", scale: 1024 },
        after: { value: "445", scale: 1 },
        factor: 10,
      },
    ] as Ratio[],
  },
  measuredOn: "Measured on a laptop's integrated graphics (Intel Core Ultra 7 265U) with a real history of about 200 sessions in 150 projects",
  figures: [
    {
      label: "Drawing a frame, focused",
      before: "17–48 ms",
      after: "about 10–11 ms",
      quote: "| drawing a frame, focused | 17–48 ms | about 10–11 ms |",
    },
    {
      label: "The city's memory, settled",
      before: "715–817 MiB (4.6 GiB in 0.2.2)",
      after: "about 445 MiB",
      quote: "| the city's memory, settled (own and GPU) | 715–817 MiB (4.6 GiB in 0.2.2) | about 445 MiB, 565 fully zoomed in |",
    },
    {
      label: "A hidden city",
      before: "7.9% of a core and 462 MiB",
      after: "under 1% and under 200 MiB",
      quote: "| a hidden city | 7.9% of a core and 462 MiB | under 1% and under 200 MiB |",
    },
    {
      label: "The daemon, settled",
      before: "up to 24% of a core",
      after: "under 1%",
      quote: "| the daemon, settled | up to 24% of a core, in bursts of several cores | under 1% |",
    },
    {
      label: "The first launch",
      before: "about 9 s to a map",
      after: "a map in about a second",
      quote: "| the first launch | up to four cores, about 9 s to a map | under one core, a map in about a second |",
    },
  ] as Figure[],
  misses: [
    {
      text: "A focused city uses about half a core, where the budget is a tenth.",
      quote: "a focused city uses about half a core where the budget is a tenth",
    },
    {
      text: "Fully zoomed in, it holds about 55 MiB more than its 512.",
      quote: "fully zoomed in it holds about 55 MiB more than its 512",
    },
  ] as Miss[],
};

export function section(changelog: string, version: string): string {
  const start = changelog.indexOf(`## [${version}]`);
  if (start < 0) return "";
  const next = changelog.indexOf("\n## [", start + 1);
  return changelog.slice(start, next < 0 ? undefined : next + 1);
}

export function numbers(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)*/g) ?? [];
}
