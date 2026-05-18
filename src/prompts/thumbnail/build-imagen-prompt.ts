import type { ThumbnailImageSpec } from "@/lib/content-architect/types";
import { CYBER_STOIC_PALETTE_PROMPT } from "@/lib/channel-palette";
import { CHANNEL_VISUAL_STYLE_PROMPT } from "@/lib/channel-visual-style";
import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";

/**
 * **Layer D — Imagen only:** pixels, scene string, overlay render contract.
 * Does not repeat title/hook/JSON rules (those live in Content Architect system parts).
 */
export function buildThumbnailImagePrompt(spec: ThumbnailImageSpec): string {
  const overlay = spec.textOverlay.toUpperCase();
  const visual = spec.visualDescription;
  const glowHint =
    spec.textGlow === "amber"
      ? "Outer glow on the letters: warm amber / gold neon, readable on navy."
      : "Outer glow on the letters: electric cyan neon, readable on navy.";

  return [
    "2D modern comic-book illustration, 16:9 YouTube video still, thick clean outlines, flat vector color fills, simple cel-shading (Upgrade Life Visualist / Chibi-Lite narrative explainer comic).",
    CHANNEL_VISUAL_STYLE_PROMPT,
    CYBER_STOIC_PALETTE_PROMPT,

    `CHARACTER LOCK (same mentor every render): ${HOST_MODEL_SHEET_PROSE}`,

    `SCENE (narrative panel — insert the beat here; stay vector-clear, no photorealism): ${visual}`,

    "Color profile: apply the PALETTE block above—deep navy/slate foundations, stable sage mentor hoodie, neon cyan sparingly for breakthroughs and clarity icons, warm amber for wins, red/orange friction and worry tags confined to the mess zone only. Clean graphic layout; no stray text except intentional infographic labels and the mandated overlay string.",

    "Composition: readable shapes at phone size; soft-focus backgrounds so the host and headline stay clear. No micro-text except intentional infographic tags you add as bold simple labels.",

    "OVERLAY TEXT (MANDATORY — DO NOT SKIP OR PARAPHRASE):",
    `Paint the following EXACT string as large, bold, ALL CAPS, highly legible sans-serif lettering in the frame (title-card or dark navy rounded pill), unobstructed by faces or busy texture: "${overlay}".`,
    glowHint,
    "The overlay must be a primary focal element—big enough to read on a phone at thumbnail size. Do not omit, shrink, or substitute different words. No extra headline that contradicts this string.",

    "Avoid: photorealism, 3D renders, realistic human photos, wrong outfit colors, cluttered illegible type, or technical jargon in any lettering.",
  ].join("\n\n");
}
