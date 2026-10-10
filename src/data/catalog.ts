import type { ImageMetadata } from "astro";
import type { Catalog } from "../../tools/media.ts";
import data from "./media.json" with { type: "json" };

export interface View {
  name: string;
  question: string;
  image: string;
}

export const media = data as Catalog & { views: View[] };

const files = import.meta.glob<{ default: ImageMetadata }>("../assets/media/*.webp", { eager: true });

export function image(name: string): ImageMetadata {
  const found = files[`../assets/media/${name}.webp`];
  if (!found) throw new Error(`no image ${name}; run make media-import`);
  return found.default;
}

export const clip = (id: string) => {
  const found = media.clips.find((c) => c.id === id);
  if (!found) throw new Error(`no clip ${id}`);
  return found;
};

export const still = (id: string) => {
  const found = media.stills.find((s) => s.id === id);
  if (!found) throw new Error(`no still ${id}`);
  return found;
};

export const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
