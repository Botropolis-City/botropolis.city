import type { Box } from "./media.ts";

// details are the stills the page shows cropped, each with the anchors its
// box must hold, so a refilm that moves the city refuses at import rather
// than cropping off what the still is for (item 360).
const harbor = { box: { x: 560, y: 300, width: 900, height: 520 } as Box, holds: ["district:driftwood", "district:saltmarsh"] };

export const details: Record<string, { box: Box; holds: string[] }> = {
  "groups/line-districts": harbor,
  "groups/line-neighbourhoods": harbor,
  "groups/line-sessions": harbor,
};
