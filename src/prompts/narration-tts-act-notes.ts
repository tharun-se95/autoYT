import type { ScriptActId } from "@/lib/script-writer/types";

/**
 * Per-act director addendum for TTS `systemInstruction` — resets emotional energy per chunk
 * and avoids long-form "list reading" drift.
 */
export const ACT_TTS_DIRECTOR_NOTES: Record<ScriptActId, string> = {
  mess:
    "Act: The Mess — open with witty, relatable energy; dry humor and a knowing smirk. Strong prosody on hooks; avoid flattening into monotone list-reading.",
  deep_dive:
    "Act: The Deep Dive — stay conversational while explaining; vary rhythm. Slow for heavy 'why it hurts' beats without sounding tired or distant.",
  mirror:
    "Act: The Mirror — more direct and intimate; brutal honesty without cruelty. Grounded, slightly weightier tone on hard truths; keep presence through the last word.",
  way_forward:
    "Act: The Way Forward — warm, optimistic, forward motion; lift on hope. End each block decisively — no trailing whisper, fade, or spectral dulling.",
};
