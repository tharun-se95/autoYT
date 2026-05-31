/** Types shared by the Content Strategist agent (Channel DNA v5). */

/** Psychology sub-themes — all under the single mindset pillar. */
export type ContentPillar = string;

/** Hook text glow: cyan = clarity / blueprint / cool highlights; amber = warmth / gold-hour / habits / money calm. */
export type ThumbnailTextGlow = "cyan" | "amber";

// NEW: Content Tone and Visual Style Preference types
export type ContentTone = "analytical" | "stoic" | "provocative" | "calm";
export type VisualStylePreference = "metaphoric" | "narrative" | "typography-focused";

/** Fallback when legacy rows or disk bootstrap meta omit scriptwriter hints. */
export const DEFAULT_SUGGESTED_TONE: ContentTone = "calm";
export const DEFAULT_SUGGESTED_VISUAL_STYLE: VisualStylePreference = "narrative";

const CONTENT_TONES = new Set<ContentTone>([
  "analytical",
  "stoic",
  "provocative",
  "calm",
]);
const VISUAL_STYLES = new Set<VisualStylePreference>([
  "metaphoric",
  "narrative",
  "typography-focused",
]);

export function parseSuggestedTone(value: unknown): ContentTone {
  return typeof value === "string" && CONTENT_TONES.has(value as ContentTone)
    ? (value as ContentTone)
    : DEFAULT_SUGGESTED_TONE;
}

export function parseSuggestedVisualStyle(value: unknown): VisualStylePreference {
  return typeof value === "string" &&
    VISUAL_STYLES.has(value as VisualStylePreference)
    ? (value as VisualStylePreference)
    : DEFAULT_SUGGESTED_VISUAL_STYLE;
}

export type VideoIdea = {
  /** Plain-language title: curiosity + SEO (topic up front), still inclusive for any age. */
  title: string;
  /** Two sentences; 2nd-person Big Brother; dry wit; Channel DNA — no tech jargon. */
  hook: string;
  /**
   * Visualist / Chibi-Lite 16:9 narrative explainer panel for Imagen; host identity in `host-model-sheet.ts`; art bans + layout in `part-4-output-discipline` + `channel-visual-style` / `channel-palette`.
   */
  thumbnailVisualDescription: string;
  /**
   * 2–6 words, ALL CAPS — curiosity open loop; exact string painted on the thumbnail (large, readable).
   */
  thumbnailTextOverlay: string;
  /** Neon glow color for the text overlay only (rest of frame uses navy + both accents per rules). */
  thumbnailTextGlow: ThumbnailTextGlow;
  /** Which foundation this idea primarily serves. */
  pillar: ContentPillar;
  // NEW: Suggested content tone for the Script Writer
  suggestedTone: ContentTone;
  // NEW: Suggested visual style for the Script Writer
  suggestedVisualStyle: VisualStylePreference;
};

/** Payload for Imagen (built from structured thumbnail fields). */
export type ThumbnailImageSpec = {
  visualDescription: string;
  textOverlay: string;
  textGlow: ThumbnailTextGlow;
};

/** One row in `generated_ideas` after a successful save, with optional persisted Imagen thumbnail. */
export type SavedStudioIdea = VideoIdea & {
  id: string;
  thumbnailDbEventId: string | null;
  thumbnailLocalRelativePath: string | null;
};

export type GenerateIdeasSuccess = {
  ok: true;
  runId: string;
  ideas: SavedStudioIdea[];
};

export type GenerateIdeasFailure = {
  ok: false;
  error: string;
};

export type GenerateIdeasResult = GenerateIdeasSuccess | GenerateIdeasFailure;
