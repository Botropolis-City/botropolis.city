import { highlights, loadRelease } from "./latest.ts";

export const latest = await loadRelease();
export const news = highlights(latest.notes);
