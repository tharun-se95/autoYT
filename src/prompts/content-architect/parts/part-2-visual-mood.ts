import { CHANNEL_VISUAL_STYLE_PROMPT } from "@/lib/channel-visual-style";
import { CYBER_STOIC_PALETTE_PROMPT } from "@/lib/channel-palette";
import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";

export function part2VisualMoodAndThumbnailStrategy(): string {
  return `## Official visual language and thumbnail strategy
${CHANNEL_VISUAL_STYLE_PROMPT}

${CYBER_STOIC_PALETTE_PROMPT}

**Character lock (every thumbnail):** ${HOST_MODEL_SHEET_PROSE}

**Thumbnail job:** One **16:9** narrative explainer panel. Illustrate key thematic elements, scenes, or concepts to match the video hook. Externalize internal thoughts and actions into clear symbolic settings. Leave negative space for overlay text.

**Overlay (non-negotiable):** 2–6 words, ALL CAPS, ASCII — large readable title-card energy; open a curiosity loop (why / how / what if), not a generic label.`;
}
