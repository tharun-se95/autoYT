/**
 * Compile-time guard: ContentTone / VisualStylePreference must assign to generated_ideas Insert.
 * Run: npx tsc --noEmit scripts/verify-generated-ideas-types.ts
 */
import type { ContentTone, VisualStylePreference } from "../src/lib/content-architect/types";
import type { Database } from "../src/lib/supabase/database.types";

type GeneratedIdeaInsert = Database["public"]["Tables"]["generated_ideas"]["Insert"];

const tone: ContentTone = "analytical";
const visual: VisualStylePreference = "metaphoric";

const _row: GeneratedIdeaInsert = {
  run_id: "00000000-0000-0000-0000-000000000000",
  title: "test",
  hook: "hook",
  thumbnail_visual_description: "desc",
  thumbnail_text_overlay: "OVERLAY",
  thumbnail_text_glow: "cyan",
  pillar: "overthinking",
  suggested_tone: tone,
  suggested_visual_style: visual,
};

void _row;
