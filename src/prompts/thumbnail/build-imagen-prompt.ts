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
      ? "Outer glow on the letters: warm amber / gold neon, highly readable."
      : "Outer glow on the letters: electric cyan neon, highly readable.";

  return [
    "2D modern cartoon-book illustration, 16:9 YouTube thumbnail, thick clean outlines, flat vector color fills, simple cel-shading, scannable at small sizes. NOT a photograph, NOT 3D, NOT realistic.",
    CHANNEL_VISUAL_STYLE_PROMPT,
    CYBER_STOIC_PALETTE_PROMPT,

    `CHARACTER LOCK (same subject/host every render): ${HOST_MODEL_SHEET_PROSE}`,

    `SCENE (narrative panel — insert the action here; stay vector-clear): ${visual}`,

    "Color profile: apply the PALETTE swatches block above. Clean graphic layout; no stray text or labels inside the image.",

    "Composition: readable shapes at phone size; clean layouts so the host and headline stay clear.",

    "OVERLAY TEXT (MANDATORY — DO NOT SKIP OR PARAPHRASE):",
    `Paint the following EXACT string as large, bold, ALL CAPS, highly legible sans-serif lettering in the frame (title-card or clean rounded pill), unobstructed by faces or busy texture: "${overlay}".`,
    glowHint,
    "The overlay must be a primary focal element — big enough to read on a phone at thumbnail size. Do not omit, shrink, or substitute different words. No extra text that contradicts this string.",

    "STRICT EXCLUSIONS: no photorealism, no 3D renders, no realistic human faces or skin texture, no cluttered illegible type.",
  ].join("\n\n");
}
