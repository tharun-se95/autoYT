import type { Database } from "@/lib/supabase/database.types";
type ChannelRow = Database["public"]["Tables"]["channels"]["Row"];

/**
 * Safely parses database JSON types (like palette_hex or style_keywords) 
 * into flat, comma-separated string arrays to prevent formatting errors.
 */
export function safeJsonToArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return [val];
  }
  return [];
}

/**
 * Dynamically compiles a prompt template by injecting a channel's style, 
 * color palette, and negative constraints to ensure perfect style isolation.
 */
export function injectChannelMetadataIntoPrompt(
  promptTemplate: string,
  channel: ChannelRow
): string {
  let finalPrompt = promptTemplate;

  // 1. Inject palette colors
  if (channel.palette_hex) {
    const parsed = safeJsonToArray(channel.palette_hex);
    const palette = parsed.length > 0 ? parsed.join(", ") : String(channel.palette_hex);
    finalPrompt = finalPrompt.replace("{{PALETTE_COLORS}}", palette);
  }

  // 2. Inject visual style instructions
  if (channel.visual_style_notes) {
    finalPrompt = finalPrompt.replace("{{VISUAL_STYLE_NOTES}}", channel.visual_style_notes);
  }

  // 3. Inject negative constraints / Forbidden list
  if (channel.visual_donts) {
    finalPrompt = finalPrompt.replace("{{VISUAL_DONTS}}", channel.visual_donts);
  }

  // 4. Inject style tags / keywords
  if (channel.style_keywords) {
    const parsed = safeJsonToArray(channel.style_keywords);
    const keywords = parsed.length > 0 ? parsed.join(", ") : String(channel.style_keywords);
    finalPrompt = finalPrompt.replace("{{STYLE_KEYWORDS}}", keywords);
  }

  return finalPrompt;
}
