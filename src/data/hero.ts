import type { Catalog, Source } from "../../tools/media.ts";

export const phoneQuery = "(max-width: 700px)";
const loopId = "metropolis/loop";
const cardId = "metropolis/card";
const card = { width: 1200, height: 630 };

export type HeroMedia =
  | { kind: "loop"; poster: string; seconds: number; sources: (Source & { media?: string })[] }
  | { kind: "still"; image: string };

// heroMedia is the title screen: the film's seamless loop of the
// metropolis, cropped 4:5 on a phone, or until the release films one,
// the hero still with a CSS drift (item 76).
export function heroMedia(catalog: Catalog): HeroMedia {
  const loop = catalog.clips.find((c) => c.id === loopId);
  if (!loop) return { kind: "still", image: "metropolis-hero" };
  const phone = loop.crops?.["4:5"]?.sources.map((s) => ({ ...s, media: phoneQuery })) ?? [];
  return { kind: "loop", poster: loop.poster, seconds: loop.seconds, sources: [...phone, ...loop.sources] };
}

// socialCard is the link preview: the film's own 1200x630 frame, or
// until the release films one, the hero still cropped to that shape.
export function socialCard(catalog: Catalog): { image: string; crop: boolean } {
  const filmed = catalog.stills.find((s) => s.id === cardId);
  if (!filmed) return { image: "metropolis-hero", crop: true };
  if (filmed.width !== card.width || filmed.height !== card.height) {
    throw new Error(`${cardId}: filmed at ${filmed.width}x${filmed.height}, where a link preview wants ${card.width}x${card.height}`);
  }
  return { image: filmed.image, crop: false };
}
