import { CYBER_STOIC_PALETTE_PROMPT } from "@/lib/channel-palette";
import { CHANNEL_VISUAL_STYLE_PROMPT } from "@/lib/channel-visual-style";
import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";

/**
 * **Layer D — Imagen:** Ken Burns / b-roll still from a script `[VIS]` line only.
 * No YouTube headline overlay (unlike `buildThumbnailImagePrompt`).
 */
export function buildVisStillImagePrompt(visualDescription: string): string {
  const visual = visualDescription.trim();

  return [
    "2D modern comic-book illustration, 16:9 YouTube video still, thick clean outlines, flat vector color fills, simple cel-shading (Upgrade Life Visualist / Chibi-Lite narrative explainer comic).",
    CHANNEL_VISUAL_STYLE_PROMPT,
    CYBER_STOIC_PALETTE_PROMPT,

    `CHARACTER LOCK (same mentor every render): ${HOST_MODEL_SHEET_PROSE}`,

    `SCENE (Ken Burns still — narrative panel; vector-clear, no photorealism): ${visual}`,

    "Color profile: apply the PALETTE block above—deep navy/slate foundations, stable sage mentor hoodie, neon cyan sparingly for breakthroughs, warm amber for wins, red/orange friction confined to the mess zone only.",

    "Typography: **no** large YouTube-style ALL CAPS headline or channel watermark. Only small infographic lettering the scene actually needs (prices, PAID tags, short labels) — legible, intentional, never cluttered.",

    "Composition: one clear focal hierarchy; soft-focus backgrounds so the host and story props read at edit scale.",

    "Avoid: photorealism, 3D renders, realistic human photos, wrong outfit colors, micro-text, or technical jargon in any lettering.",
  ].join("\n\n");
}
